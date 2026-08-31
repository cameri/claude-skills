/**
 * Pure fingerprint/diff logic for the immune-system watcher.
 *
 * An "entry" is one top-level install under a watch root: a plugin directory
 * (Claude Code cache or omp cache), a skill directory, a hook directory, or a
 * standalone watched file (e.g. ~/.claude/settings.json). Entries are
 * fingerprinted so a sweep can detect which ones are new or changed without
 * hashing every byte on every pass.
 *
 * Fingerprint design:
 * - mtimeMs: the newest file mtime in the entry.
 * - size:    total bytes of all non-skipped files.
 * - hash:    sha256 over the sorted list of per-file records. Manifest files
 *            (SKILL.md, plugin.json, package.json, README.md, settings.json,
 *            .mcp.json, hooks/*) are content-hashed — a directive change in a
 *            previously-approved skill is the attack we care about. All other
 *            files contribute `relpath:size:mtimeMs`, which is cheap to
 *            recompute every sweep.
 *
 * Skipped subtrees: node_modules, .git, dist, build, target, .venv,
 * .worktrees, .next and lockfiles — dependency and build noise that churns
 * without representing author intent.
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";

export const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "target",
  ".venv",
  ".worktrees",
  ".next",
  ".cache",
]);

export const SKIP_FILE_NAMES = new Set([
  "bun.lock",
  "bun.lockb",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  ".DS_Store",
]);

const MANIFEST_FILE_NAMES = new Set([
  "SKILL.md",
  "plugin.json",
  "package.json",
  "README.md",
  "settings.json",
  ".mcp.json",
]);

export interface EntryFingerprint {
  mtimeMs: number;
  size: number;
  hash: string;
}

export interface EntryRecord {
  /** relpath within the entry ("" for the entry root itself) */
  rel: string;
  size: number;
  mtimeMs: number;
}

export function isManifestFile(rel: string): boolean {
  if (MANIFEST_FILE_NAMES.has(basename(rel))) return true;
  // Anything under a hooks/ or scripts/ directory — the executable surface.
  return rel.split(sep).some((part) => part === "hooks");
}

/** Walk all non-skipped files under a directory, sorted for determinism. */
export function walkFiles(dir: string): string[] {
  const out: string[] = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    let names: string[];
    try {
      names = readdirSync(current);
    } catch {
      continue; // unreadable/vanished mid-walk — skip
    }
    for (const name of names) {
      if (SKIP_DIR_NAMES.has(name) || SKIP_FILE_NAMES.has(name)) continue;
      const full = join(current, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        stack.push(full);
      } else if (st.isFile()) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

/**
 * Fingerprint a single file by full content hash. Used for standalone watched
 * files like ~/.claude/settings.json, where any byte change (a hook
 * registration, a blocklisted permission) is significant.
 */
export function fingerprintFile(file: string): EntryFingerprint {
  const st = statSync(file);
  const hash = createHash("sha256").update(readFileSync(file)).digest("hex");
  return { mtimeMs: st.mtimeMs, size: st.size, hash };
}

/**
 * Fingerprint an entry directory. Content-hashes manifest files, stats the
 * rest, and combines everything into one deterministic hash.
 */
export function fingerprintEntry(entryPath: string): EntryFingerprint {
  const files = walkFiles(entryPath);
  const records: EntryRecord[] = [];
  let mtimeMs = 0;
  let size = 0;

  for (const file of files) {
    const st = statSync(file);
    mtimeMs = Math.max(mtimeMs, st.mtimeMs);
    size += st.size;
    records.push({ rel: relative(entryPath, file), size: st.size, mtimeMs: st.mtimeMs });
  }

  const parts: string[] = [];
  for (const rec of records.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0))) {
    if (isManifestFile(rec.rel)) {
      const file = join(entryPath, rec.rel);
      const contentHash = createHash("sha256").update(readFileSync(file)).digest("hex");
      parts.push(`${rec.rel}\x00content:${contentHash}`);
    } else {
      parts.push(`${rec.rel}\x00${rec.size}\x00${rec.mtimeMs}`);
    }
  }

  const hash = createHash("sha256").update(parts.join("\n")).digest("hex");
  return { mtimeMs, size, hash };
}

export type Snapshot = Record<string, EntryFingerprint>;

export interface SnapshotDiff {
  added: string[];
  changed: string[];
  removed: string[];
}

/** Diff two snapshots keyed by absolute entry path. */
export function diffSnapshots(prev: Snapshot, next: Snapshot): SnapshotDiff {
  const added: string[] = [];
  const changed: string[] = [];
  const removed: string[] = [];

  for (const [path, fp] of Object.entries(next)) {
    const old = prev[path];
    if (!old) {
      added.push(path);
    } else if (old.hash !== fp.hash) {
      changed.push(path);
    }
  }
  for (const path of Object.keys(prev)) {
    if (!next[path]) removed.push(path);
  }
  return { added, changed, removed };
}

/** Infer what kind of thing an entry is from its path. */
export function inferKind(entryPath: string): "plugin" | "skill" | "hook" | "hooks-config" | "other" {
  if (basename(entryPath) === "settings.json") return "hooks-config";
  const parts = entryPath.split(sep);
  if (parts.includes("hooks")) return "hook";
  if (basename(entryPath) === "skills" || parts.includes("skills")) return "skill";
  if (parts.includes("plugins")) return "plugin";
  return "other";
}