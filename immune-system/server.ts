#!/usr/bin/env bun
/**
 * immune-system — always-on watcher for newly-installed or newly-built
 * skills, plugins, and hooks.
 *
 * Every sweep pass fingerprints every top-level entry under each watch root
 * (Claude Code plugin cache, omp plugin cache, user skills dirs, hook dirs,
 * and the settings.json hook registrations). New or changed entries become
 * `pending` findings; a batched `notifications/claude/channel` alert wakes
 * the session so the `immune-response` skill can review them. The server
 * exposes quarantine/restore/remove/clear tools for the response protocol —
 * the server moves files, the skill decides.
 *
 * State: ~/.claude/channels/immune-system/
 *   state.json  — watch config, entry fingerprint snapshot, findings
 *   quarantine/ — entries moved out of the live tree (with META.json)
 *   config.json — optional { sweepIntervalMs, extraWatchRoots }
 *
 * Override the state dir with IMMUNE_SYSTEM_STATE_DIR.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync, readdirSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import {
  diffSnapshots,
  fingerprintEntry,
  fingerprintFile,
  inferKind,
  type EntryFingerprint,
  type Snapshot,
} from "./lib/fingerprint.ts";

// ── State ─────────────────────────────────────────────────────────────────────

const STATE_DIR = process.env.IMMUNE_SYSTEM_STATE_DIR ?? join(homedir(), ".claude", "channels", "immune-system");
const STATE_FILE = join(STATE_DIR, "state.json");
const CONFIG_FILE = join(STATE_DIR, "config.json");
const QUARANTINE_DIR = join(STATE_DIR, "quarantine");

mkdirSync(QUARANTINE_DIR, { recursive: true });

interface WatcherConfig {
  sweepIntervalMs: number;
  extraWatchRoots: string[];
}

const DEFAULT_CONFIG: WatcherConfig = {
  sweepIntervalMs: 60_000,
  extraWatchRoots: [],
};

function loadConfig(): WatcherConfig {
  try {
    const raw = JSON.parse(readFileSync(CONFIG_FILE, "utf8")) as Partial<WatcherConfig>;
    return {
      sweepIntervalMs:
        typeof raw.sweepIntervalMs === "number" && raw.sweepIntervalMs >= 1000
          ? raw.sweepIntervalMs
          : DEFAULT_CONFIG.sweepIntervalMs,
      extraWatchRoots: Array.isArray(raw.extraWatchRoots) ? raw.extraWatchRoots : [],
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(cfg: WatcherConfig): void {
  writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

interface Finding {
  path: string;
  kind: string;
  status: "pending" | "cleared" | "quarantined" | "removed";
  firstSeenAt: string;
  changedAt: string;
  hash: string;
  note?: string;
  quarantinePath?: string;
  originalPath?: string;
}

interface State {
  roots: Record<string, { source: "default" | "extra-exists" | "extra-missing" }>;
  snapshot: Snapshot;
  findings: Record<string, Finding>;
  lastSweepAt: string | null;
}

function defaultState(): State {
  return { roots: {}, snapshot: {}, findings: {}, lastSweepAt: null };
}

function loadState(): State {
  try {
    const raw = JSON.parse(readFileSync(STATE_FILE, "utf8")) as State;
    return { roots: raw.roots ?? {}, snapshot: raw.snapshot ?? {}, findings: raw.findings ?? {}, lastSweepAt: raw.lastSweepAt ?? null };
  } catch {
    return defaultState();
  }
}

function saveState(): void {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

let state = loadState();
let config = loadConfig();

// ── Watch roots ───────────────────────────────────────────────────────────────

/** Default roots, existence-checked — never assume an install location. */
function defaultRoots(): string[] {
  const home = homedir();
  const candidates = [
    join(home, ".claude", "plugins", "cache"),
    join(home, ".claude", "skills"),
    join(home, ".claude", "hooks"),
    join(home, ".claude", "settings.json"),
    join(home, ".omp", "plugins", "cache", "plugins"),
    join(home, ".omp", "agent", "skills"),
    join(home, ".omp", "skills"),
  ];
  return candidates.filter((p) => existsSync(p));
}

function computeRoots(): Record<string, { source: "default" | "extra-exists" | "extra-missing" }> {
  const roots: Record<string, { source: "default" | "extra-exists" | "extra-missing" }> = {};
  for (const root of defaultRoots()) roots[root] = { source: "default" };
  for (const extra of config.extraWatchRoots) {
    const resolved = resolve(extra);
    roots[resolved] = { source: existsSync(resolved) ? "extra-exists" : "extra-missing" };
  }
  return roots;
}

/** List the entry paths (top-level children) under one watch root. */
function entriesUnderRoot(root: string): string[] {
  const st = statSync(root);
  if (st.isFile()) return [root];
  return readdirSync(root)
    .map((name) => join(root, name))
    .filter((p) => {
      try {
        return statSync(p).isDirectory();
      } catch {
        return false;
      }
    });
}

function entryFingerprint(path: string): EntryFingerprint {
  return statSync(path).isFile() ? fingerprintFile(path) : fingerprintEntry(path);
}

// ── Sweep / findings ──────────────────────────────────────────────────────────

function isInsideWatchRoot(entryPath: string): boolean {
  const resolved = resolve(entryPath);
  return Object.keys(state.roots).some((root) => {
    const resolvedRoot = resolve(root);
    return resolved === resolvedRoot || resolved.startsWith(resolvedRoot + sep);
  });
}

function upsertFindings(added: string[], changed: string[]): { toNotify: string[]; lines: string[] } {
  const toNotify: string[] = [];
  const lines: string[] = [];
  const now = new Date().toISOString();

  for (const path of [...added, ...changed]) {
    const kind = inferKind(path);
    const existing = state.findings[path];
    const action: "new" | "changed" = added.includes(path) ? "new" : "changed";

    if (existing) {
      existing.hash = state.snapshot[path].hash;
      existing.changedAt = now;
      // Re-notify only when a reviewed entry changed again — an already-pending
      // entry is still awaiting review and would just re-spam the session.
      if (existing.status === "cleared" || existing.status === "removed") {
        existing.status = "pending";
        existing.note = undefined;
        toNotify.push(path);
        lines.push(`- ${path} (${kind}, ${action} since review)`);
      }
    } else {
      state.findings[path] = {
        path,
        kind,
        status: "pending",
        firstSeenAt: now,
        changedAt: now,
        hash: state.snapshot[path].hash,
      };
      toNotify.push(path);
      lines.push(`- ${path} (${kind}, ${action})`);
    }
  }
  return { toNotify, lines };
}

function sweep(notify: boolean): { changed: number; notified: number } {
  state.roots = computeRoots();
  const next: Snapshot = {};

  for (const root of Object.keys(state.roots)) {
    if (state.roots[root].source === "extra-missing") continue;
    for (const entry of entriesUnderRoot(root)) {
      try {
        next[entry] = entryFingerprint(entry);
      } catch {
        // Entry vanished mid-sweep — leave it out; the diff handles it.
      }
    }
  }

  
  const diff = diffSnapshots(state.snapshot, next);

  // First sweep on a fresh state: adopt the existing tree as the known-good
  // baseline — nothing already on disk is "newly installed", so no findings.
  if (state.lastSweepAt === null) {
    state.snapshot = next;
    state.lastSweepAt = new Date().toISOString();
    saveState();
    return { changed: 0, notified: 0 };
  }

  // Snapshot must be current before findings are upserted — new findings read
  // the entry hash out of it.
  state.snapshot = next;
  state.lastSweepAt = new Date().toISOString();
  saveState();

  // Entries that disappeared: expected after quarantine (keep status), or
  // uninstalled (mark removed, no alert).
  for (const path of diff.removed) {
    const finding = state.findings[path];
    if (finding && finding.status !== "quarantined") {
      finding.status = "removed";
      finding.changedAt = new Date().toISOString();
      finding.note = "entry no longer present";
    }
  }

  const { toNotify, lines } = upsertFindings(diff.added, diff.changed);

  if (notify && toNotify.length > 0) {
    fireReviewNotification(lines);
  }
  return { changed: diff.added.length + diff.changed.length, notified: toNotify.length };
}

function fireReviewNotification(lines: string[]): void {
  const content = [
    `Immune-system: ${lines.length} skill/plugin/hook entr${lines.length === 1 ? "y" : "ies"} ${lines.length === 1 ? "needs" : "need"} review:`,
    ...lines,
    ``,
    `Run the immune-response protocol to evaluate each one.`,
  ].join("\n");

  void mcp
    .notification({
      method: "notifications/claude/channel",
      params: {
        content,
        meta: {
          source: "immune-system",
          kind: "review",
          count: String(lines.length),
          swept_at: new Date().toISOString(),
        },
      },
    })
    .catch((err: unknown) => {
      process.stderr.write(`immune-system: notification failed: ${err instanceof Error ? err.message : String(err)}\n`);
    });
}

// ── Quarantine operations ────────────────────────────────────────────────────

function requireFindableFinding(id: string): Finding {
  const finding = state.findings[id];
  if (!finding) throw new Error(`no finding for ${id}`);
  return finding;
}

function quarantineEntry(id: string, reason: string, detail: string): string {
  const finding = requireFindableFinding(id);
  if (!isInsideWatchRoot(finding.path)) throw new Error("refusing to quarantine outside a watch root");
  if (finding.status === "quarantined") throw new Error("already quarantined");

  const target = join(QUARANTINE_DIR, `${basename(finding.path)}-${Date.now()}`);
  mkdirSync(target, { recursive: true });
  // Move the entry itself underneath the new quarantine dir name.
  const movedTo = join(target, basename(finding.path));
  renameSync(finding.path, movedTo);

  const meta = {
    originalPath: finding.path,
    quarantinedAt: new Date().toISOString(),
    reason,
    detail,
    hash: finding.hash,
  };
  writeFileSync(join(target, "META.json"), JSON.stringify(meta, null, 2));

  finding.status = "quarantined";
  finding.quarantinePath = movedTo;
  finding.originalPath = finding.path;
  finding.note = reason;
  finding.changedAt = new Date().toISOString();
  saveState();
  return movedTo;
}

function restoreEntry(id: string): string {
  const finding = requireFindableFinding(id);
  if (finding.status !== "quarantined" || !finding.quarantinePath) {
    throw new Error("only quarantined entries can be restored");
  }
  const src = finding.quarantinePath;
  if (!src.startsWith(QUARANTINE_DIR + sep)) throw new Error("refusing restore from outside quarantine");
  const dest = finding.originalPath ?? finding.path;
  renameSync(src, dest);

  finding.status = "cleared";
  finding.note = "restored (false positive)";
  finding.quarantinePath = undefined;
  finding.changedAt = new Date().toISOString();
  saveState();
  return dest;
}

function removeEntry(id: string): void {
  const finding = requireFindableFinding(id);
  if (finding.status !== "quarantined" || !finding.quarantinePath) {
    throw new Error("only quarantined entries can be permanently removed");
  }
  const qp = finding.quarantinePath;
  if (!qp.startsWith(QUARANTINE_DIR + sep)) throw new Error("refusing removal outside quarantine");
  rmSync(qp, { recursive: true, force: true });
  finding.status = "removed";
  finding.note = "permanently removed (operator-confirmed)";
  finding.changedAt = new Date().toISOString();
  saveState();
}

function clearFinding(id: string, note: string): void {
  const finding = requireFindableFinding(id);
  if (finding.status !== "pending") throw new Error("only pending findings can be cleared");
  finding.status = "cleared";
  finding.note = note;
  finding.changedAt = new Date().toISOString();
  saveState();
}

// ── MCP Server ────────────────────────────────────────────────────────────────

const mcp = new Server(
  { name: "plugin:immune-system", version: "0.1.0" },
  {
    capabilities: { tools: {}, experimental: { "claude/channel": {} } },
    instructions: [
      "You are the immune-system watcher for this agent instance.",
      "Sweeps every skill/plugin/hook install location and flags new or changed entries for review.",
      "Channel notifications arrive with source=\"immune-system\" and kind=\"review\" when entries need evaluation.",
      "",
      "Tools: scan, list_findings, quarantine, restore, remove, clear, status",
    ].join("\n"),
  },
);

function textResult(text: string, details: unknown) {
  return { content: [{ type: "text" as const, text }], structuredContent: details };
}

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "scan",
      description: "Force an immediate sweep of all watch roots and return new/changed findings. Use to check for recently-installed or recently-modified skills, plugins, or hooks right now instead of waiting for the next interval.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "list_findings",
      description: "List all current findings with their status (pending, cleared, quarantined, removed). Use to see what needs review or what has been dealt with.",
      inputSchema: {
        type: "object",
        properties: { status: { type: "string", description: "filter by status: pending, cleared, quarantined, removed (omit for all)" } },
        required: [],
      },
    },
    {
      name: "quarantine",
      description: "Move an entry out of the live tree into quarantine so it stops loading, recording reason and evidence. Use when a review confirms a skill/plugin/hook is malicious or compromised.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "entry path of the finding (from list_findings)" },
          reason: { type: "string", description: "short reason, e.g. 'red-flag directive: exfiltration'" },
          detail: { type: "string", description: "full evidence narrative" },
        },
        required: ["id", "reason"],
      },
    },
    {
      name: "restore",
      description: "Move a quarantined entry back to its original location. Use for false positives after the operator confirms the item is safe.",
      inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    },
    {
      name: "remove",
      description: "Permanently delete a quarantined entry. Only call after the operator has explicitly confirmed removal — never unilaterally.",
      inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    },
    {
      name: "clear",
      description: "Mark a pending finding as reviewed and safe, with a note recording the verdict. Use when evaluation finds no threat.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "entry path of the finding" },
          note: { type: "string", description: "verdict — what was checked and why it is safe" },
        },
        required: ["id", "note"],
      },
    },
    {
      name: "status",
      description: "Show watcher state: watch roots, sweep interval, last sweep time, and finding counts per status.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
  ],
}));

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  const name = req.params.name;
  const args = (req.params.arguments ?? {}) as Record<string, string | undefined>;
  try {
    switch (name) {
      case "scan": {
        const { changed, notified } = sweep(true);
        return textResult(`Sweep complete: ${changed} new/changed entries, ${notified} notified for review.`, {
          changed,
          notified,
          lastSweepAt: state.lastSweepAt,
        });
      }
      case "list_findings": {
        const filter = args.status;
        const findings = Object.values(state.findings).filter((f) => !filter || f.status === filter);
        const lines = findings.map((f) => `${f.status}\t${f.kind}\t${f.path}${f.note ? `\t(${f.note})` : ""}`);
        return textResult(
          lines.length > 0 ? lines.join("\n") : "No findings.",
          { count: findings.length, findings: findings.map(({ path, kind, status, note }) => ({ path, kind, status, note })) },
        );
      }
      case "quarantine": {
        if (!args.id || !args.reason) throw new Error("id and reason are required");
        const movedTo = quarantineEntry(args.id, args.reason, args.detail ?? "");
        return textResult(`Quarantined ${args.id} → ${movedTo}`, { quarantined: args.id, movedTo });
      }
      case "restore": {
        if (!args.id) throw new Error("id is required");
        const dest = restoreEntry(args.id);
        return textResult(`Restored ${args.id} → ${dest}`, { restored: args.id, dest });
      }
      case "remove": {
        if (!args.id) throw new Error("id is required");
        removeEntry(args.id);
        return textResult(`Removed ${args.id} permanently.`, { removed: args.id });
      }
      case "clear": {
        if (!args.id || !args.note) throw new Error("id and note are required");
        clearFinding(args.id, args.note);
        return textResult(`Cleared ${args.id} (${args.note})`, { cleared: args.id, note: args.note });
      }
      case "status": {
        const counts: Record<string, number> = {};
        for (const f of Object.values(state.findings)) counts[f.status] = (counts[f.status] ?? 0) + 1;
        return textResult(
          [
            `Watch roots (${Object.keys(state.roots).length}):`,
            ...Object.entries(state.roots).map(([root, meta]) => `  ${root} (${meta.source})`),
            `Sweep interval: ${config.sweepIntervalMs}ms`,
            `Last sweep: ${state.lastSweepAt ?? "never"}`,
            `Findings: ${JSON.stringify(counts)}`,
          ].join("\n"),
          { roots: state.roots, sweepIntervalMs: config.sweepIntervalMs, lastSweepAt: state.lastSweepAt, counts },
        );
      }
      default:
        throw new Error(`unknown tool: ${name}`);
    }
  } catch (err: unknown) {
    throw new Error(`immune-system: ${err instanceof Error ? err.message : String(err)}`);
  }
});

// ── Startup ─────────────────────────────────────────────────────────────────────

// Baseline sweep at startup — fingerprints the existing tree without
// notifying (nothing is "newly" installed yet).
sweep(false);

const interval = setInterval(() => {  try {
    sweep(true);
  } catch (err: unknown) {
    process.stderr.write(`immune-system: sweep error: ${err instanceof Error ? err.message : String(err)}\n`);
  }
}, config.sweepIntervalMs);
interval.unref();

await mcp.connect(new StdioServerTransport());

const shutdown = () => {
  clearInterval(interval);
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);