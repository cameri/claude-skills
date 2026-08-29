#!/usr/bin/env bun
/**
 * Claude Code Cronjobs Channel Server
 *
 * MCP server that manages cron jobs and notifies Claude when they fire.
 * Supports natural language schedule expressions:
 *   "every 3 minutes", "every weekday at 3am", "once in 5 minutes"
 *
 * State: ~/.claude/channels/cronjobs/jobs.json
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Cron } from "croner";

// ── State ─────────────────────────────────────────────────────────────────────

const STATE_DIR = join(homedir(), ".claude", "channels", "cronjobs");
const JOBS_FILE = join(STATE_DIR, "jobs.json");
// /tmp, not STATE_DIR: STATE_DIR is persistent (jobs.json must survive restarts), but a pid
// lock must NOT — a stale pid surviving a restart could collide with a reused pid and make
// the real server refuse to start against itself. Process start-time is also recorded and
// re-checked below so even a same-pid coincidence after a restart isn't mistaken for the
// original process.
const PID_FILE = join(tmpdir(), "claude-cronjobs-server.pid");

mkdirSync(STATE_DIR, { recursive: true });

function processStartTime(pid: number): string | null {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf-8");
    return stat.slice(stat.lastIndexOf(")") + 2).split(" ")[19] ?? null;
  } catch {
    return null; // /proc unavailable (non-Linux)
  }
}

function processState(pid: number): string | null {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf-8");
    // State is the third field, after comm — comm can contain spaces/parens,
    // so locate it after the final ")" like processStartTime does.
    return stat.slice(stat.lastIndexOf(")") + 2).split(" ")[0] ?? null;
  } catch {
    return null; // /proc unavailable (non-Linux)
  }
}

function isSameServerAlive(pid: number, recordedStartTime: string): boolean {
  try {
    process.kill(pid, 0);
  } catch {
    return false;
  }
  // A zombie (state Z) is dead — kill(pid, 0) still succeeds for it because
  // the entry lingers until the parent reaps it. Treat it as not alive so a
  // stale pid file can't block the server in a container whose init never
  // reaps (the pid's starttime would otherwise match forever).
  if (processState(pid) === "Z") return false;
  const currentStartTime = processStartTime(pid);
  return currentStartTime === null ? true : currentStartTime === recordedStartTime;
}

if (existsSync(PID_FILE)) {
  const [pidStr, recordedStartTime] = readFileSync(PID_FILE, "utf-8").trim().split(":");
  const existingPid = parseInt(pidStr, 10);
  if (!isNaN(existingPid) && recordedStartTime && isSameServerAlive(existingPid, recordedStartTime)) {
    process.stderr.write(`cronjobs: another instance is already running (pid ${existingPid}) — refusing to start a second one.\n`);
    process.exit(1);
  }
}
writeFileSync(PID_FILE, `${process.pid}:${processStartTime(process.pid) ?? ""}`);

// All "at TIME"/raw-cron schedules are meant in the server's local time, not
// UTC — croner defaults to UTC unless told otherwise, which silently ran
// every job ~4-5h off from what its schedule string implied.
const TIMEZONE = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;

interface Job {
  id: string;
  task: string;
  expression: string; // cron string or ISO timestamp for once
  type: "cron" | "once";
  created: string;
  nextRun?: string;
}

function loadJobs(): Job[] {
  try {
    return JSON.parse(readFileSync(JOBS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveJobs(jobs: Job[]): void {
  writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));
}

// ── Natural language parser ───────────────────────────────────────────────────

type Parsed = { type: "cron"; value: string } | { type: "once"; value: string };

function parseTime(s: string): { hour: number; minute: number } | null {
  s = s.trim();
  if (s === "noon") return { hour: 12, minute: 0 };
  if (s === "midnight") return { hour: 0, minute: 0 };
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  let hour = parseInt(m[1]);
  const minute = m[2] ? parseInt(m[2]) : 0;
  const period = m[3]?.toLowerCase();
  if (period === "am" && hour === 12) hour = 0;
  if (period === "pm" && hour !== 12) hour += 12;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

const DAY_NAMES: Record<string, string> = {
  sunday: "0", monday: "1", tuesday: "2", wednesday: "3",
  thursday: "4", friday: "5", saturday: "6",
  sun: "0", mon: "1", tue: "2", wed: "3", thu: "4", fri: "5", sat: "6",
};

export function parseExpression(expr: string): Parsed | null {
  const e = expr.trim().toLowerCase();

  let m: RegExpMatchArray | null;

  // ── One-time ───────────────────────────────────────────────────────────────

  // "once in N seconds/minutes/hours"
  m = e.match(/^once\s+in\s+(\d+)\s+(seconds?|minutes?|hours?)$/);
  if (m) {
    const n = parseInt(m[1]);
    const unit = m[2];
    const ms = unit.startsWith("second") ? n * 1_000
      : unit.startsWith("minute") ? n * 60_000
      : n * 3_600_000;
    return { type: "once", value: new Date(Date.now() + ms).toISOString() };
  }

  // "in N seconds/minutes/hours"
  m = e.match(/^in\s+(\d+)\s+(seconds?|minutes?|hours?)$/);
  if (m) {
    const n = parseInt(m[1]);
    const unit = m[2];
    const ms = unit.startsWith("second") ? n * 1_000
      : unit.startsWith("minute") ? n * 60_000
      : n * 3_600_000;
    return { type: "once", value: new Date(Date.now() + ms).toISOString() };
  }

  // ── Aliases ────────────────────────────────────────────────────────────────

  if (e === "every minute") return { type: "cron", value: "* * * * *" };
  if (e === "every hour") return { type: "cron", value: "0 * * * *" };
  if (e === "every day" || e === "daily") return { type: "cron", value: "0 0 * * *" };

  // ── Every N units ──────────────────────────────────────────────────────────

  // "every N seconds" (6-field cron with seconds)
  m = e.match(/^every\s+(\d+)\s+seconds?$/);
  if (m) {
    const n = parseInt(m[1]);
    return { type: "cron", value: n === 1 ? "* * * * * *" : `*/${n} * * * * *` };
  }

  // "every N minutes"
  m = e.match(/^every\s+(\d+)\s+minutes?$/);
  if (m) {
    const n = parseInt(m[1]);
    return { type: "cron", value: n === 1 ? "* * * * *" : `*/${n} * * * *` };
  }

  // "every N hours"
  m = e.match(/^every\s+(\d+)\s+hours?$/);
  if (m) {
    const n = parseInt(m[1]);
    return { type: "cron", value: n === 1 ? "0 * * * *" : `0 */${n} * * *` };
  }

  // ── Every day/weekday/weekend at TIME ──────────────────────────────────────

  m = e.match(/^every\s+day\s+at\s+(.+)$/);
  if (m) {
    const t = parseTime(m[1]);
    if (t) return { type: "cron", value: `${t.minute} ${t.hour} * * *` };
  }

  m = e.match(/^every\s+(weekday|weekdays)\s+at\s+(.+)$/);
  if (m) {
    const t = parseTime(m[2]);
    if (t) return { type: "cron", value: `${t.minute} ${t.hour} * * 1-5` };
  }

  m = e.match(/^every\s+(weekend|weekends)\s+at\s+(.+)$/);
  if (m) {
    const t = parseTime(m[2]);
    if (t) return { type: "cron", value: `${t.minute} ${t.hour} * * 0,6` };
  }

  m = e.match(/^every\s+(weekday|weekdays)$/);
  if (m) return { type: "cron", value: "0 0 * * 1-5" };

  m = e.match(/^every\s+(weekend|weekends)$/);
  if (m) return { type: "cron", value: "0 0 * * 0,6" };

  // ── Every named day [at TIME] ──────────────────────────────────────────────

  m = e.match(/^every\s+(\w+)\s+at\s+(.+)$/);
  if (m) {
    const dayNum = DAY_NAMES[m[1]];
    const t = parseTime(m[2]);
    if (dayNum !== undefined && t) {
      return { type: "cron", value: `${t.minute} ${t.hour} * * ${dayNum}` };
    }
  }

  m = e.match(/^every\s+(\w+)$/);
  if (m) {
    const dayNum = DAY_NAMES[m[1]];
    if (dayNum !== undefined) return { type: "cron", value: `0 0 * * ${dayNum}` };
  }

  // ── Raw cron expression (5 or 6 space-separated fields) ───────────────────

  if (/^[\d*/,\-\s]+$/.test(e)) {
    const fields = e.trim().split(/\s+/);
    if (fields.length === 5 || fields.length === 6) {
      return { type: "cron", value: e.trim() };
    }
  }

  return null;
}

// ── Job management ────────────────────────────────────────────────────────────

// Forward declaration — mcp is used inside job callbacks.
let mcp: Server;

type StopHandle = { stop(): void };
const activeJobs = new Map<string, StopHandle>();

function stopJob(id: string): void {
  activeJobs.get(id)?.stop();
  activeJobs.delete(id);
}

function fireNotification(job: Job): void {
  void mcp.notification({
    method: "notifications/claude/channel",
    params: {
      content: `Job fired: ${job.task}`,
      meta: {
        source: "cronjobs",
        job_id: job.id,
        task: job.task,
        type: job.type,
        ...(job.type === "cron" ? { expression: job.expression } : {}),
        fired_at: new Date().toISOString(),
      },
    },
  });
}

// nextRun is display-only metadata — croner computes the actual schedule
// internally and never updates the persisted value, so a nextRun written at
// add-time goes stale after the first fire. Compute it fresh on demand.
function computeNextRun(job: Job): string | null {
  if (job.type === "once") return job.expression;
  try {
    const probe = new Cron(job.expression, { paused: true, timezone: TIMEZONE });
    const next = probe.nextRun();
    probe.stop();
    return next ? next.toISOString() : null;
  } catch {
    return null;
  }
}

function startJob(job: Job): void {
  stopJob(job.id);

  if (job.type === "once") {
    const fireAt = new Date(job.expression).getTime();
    const delay = fireAt - Date.now();
    if (delay <= 0) {
      // Already past — clean up
      saveJobs(loadJobs().filter(j => j.id !== job.id));
      return;
    }
    const timer = setTimeout(() => {
      fireNotification(job);
      saveJobs(loadJobs().filter(j => j.id !== job.id));
      activeJobs.delete(job.id);
    }, delay);
    activeJobs.set(job.id, { stop: () => clearTimeout(timer) });
  } else {
    const cron = new Cron(job.expression, { timezone: TIMEZONE }, () => {
      fireNotification(job);
    });
    activeJobs.set(job.id, cron);
  }
}

// ── MCP Server ────────────────────────────────────────────────────────────────

mcp = new Server(
  { name: "plugin:cronjobs", version: "1.0.0" },
  {
    capabilities: { tools: {}, experimental: { "claude/channel": {} } },
    instructions: [
      "You are a cron job manager. You can schedule jobs to run at specific times or intervals.",
      "When a job fires, you receive a channel notification — act on the task described.",
      "",
      "Tools: add-job, list-jobs, remove-job, clear-jobs",
      "",
      "Supported schedule expressions:",
      "  once in 5 minutes       — fires once after a delay",
      "  every 3 minutes         — recurring interval",
      "  every hour              — top of every hour",
      "  every day at 9am        — daily at a specific time",
      "  every weekday at 3am    — Mon–Fri at a specific time",
      "  every monday at 10:30am — specific weekday at a time",
      "  every weekend at noon   — Sat+Sun at noon",
      "  <5-field cron>          — raw cron expression",
    ].join("\n"),
  },
);

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "add-job",
      description: "Schedule a job to run at a specific time or recurring interval.",
      inputSchema: {
        type: "object",
        properties: {
          task: { type: "string", description: "What to do when the job fires (shown in the channel notification)" },
          expression: { type: "string", description: "Natural language schedule: 'every 3 minutes', 'every weekday at 3am', 'once in 5 minutes'; or a raw 5-field cron expression" },
        },
        required: ["task", "expression"],
      },
    },
    {
      name: "list-jobs",
      description: "List all active jobs.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "remove-job",
      description: "Remove a job by its ID.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Job ID to remove" },
        },
        required: ["id"],
      },
    },
    {
      name: "clear-jobs",
      description: "Remove all active jobs.",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = (req.params.arguments ?? {}) as Record<string, string>;

  switch (req.params.name) {
    case "add-job": {
      const parsed = parseExpression(args.expression);
      if (!parsed) {
        return {
          content: [{ type: "text", text: `Cannot parse expression: "${args.expression}". Try "every 3 minutes", "every weekday at 3am", or "once in 5 minutes".` }],
          isError: true,
        };
      }

      const id = randomUUID().slice(0, 8);
      const job: Job = {
        id,
        task: args.task,
        expression: parsed.value,
        type: parsed.type,
        created: new Date().toISOString(),
      };

      if (parsed.type === "cron") {
        try {
          const probe = new Cron(parsed.value, { paused: true, timezone: TIMEZONE });
          const next = probe.nextRun();
          probe.stop();
          if (next) job.nextRun = next.toISOString();
        } catch (e) {
          return { content: [{ type: "text", text: `Invalid cron expression: ${(e as Error).message}` }], isError: true };
        }
      } else {
        job.nextRun = parsed.value;
      }

      const jobs = loadJobs();
      jobs.push(job);
      saveJobs(jobs);
      startJob(job);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ id, task: args.task, expression: args.expression, cronExpression: parsed.value, type: parsed.type, nextRun: job.nextRun }, null, 2),
        }],
      };
    }

    case "list-jobs": {
      const jobs = loadJobs().map(j => ({ ...j, nextRun: computeNextRun(j) ?? undefined }));
      if (jobs.length === 0) {
        return { content: [{ type: "text", text: "No active jobs." }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(jobs, null, 2) }] };
    }

    case "remove-job": {
      stopJob(args.id);
      const before = loadJobs();
      const after = before.filter(j => j.id !== args.id);
      if (before.length === after.length) {
        return { content: [{ type: "text", text: `Job "${args.id}" not found.` }], isError: true };
      }
      saveJobs(after);
      return { content: [{ type: "text", text: `Job ${args.id} removed.` }] };
    }

    case "clear-jobs": {
      for (const id of activeJobs.keys()) stopJob(id);
      const count = loadJobs().length;
      saveJobs([]);
      return { content: [{ type: "text", text: `Cleared ${count} job(s).` }] };
    }

    default:
      return { content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }], isError: true };
  }
});

// Connect MCP transport before starting any jobs (no notifications are lost).
await mcp.connect(new StdioServerTransport());

// Load and start persisted jobs.
const existing = loadJobs();
let loaded = 0;
for (const j of existing) {
  if (j.type === "once" && new Date(j.expression) <= new Date()) continue; // expired
  startJob(j);
  loaded++;
}
process.stderr.write(`cronjobs: ${loaded} job(s) loaded\n`);

// ── Graceful shutdown ─────────────────────────────────────────────────────────

const shutdown = () => {
  for (const id of activeJobs.keys()) stopJob(id);
  try { unlinkSync(PID_FILE); } catch { /* already gone */ }
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
