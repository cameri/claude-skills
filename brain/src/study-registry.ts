import type { Database } from "@hajewski/latticedb";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface GraphifyRunCost {
  inputTokens: number;
  outputTokens: number;
  files: number;
}

export interface GraphifyMetadata {
  corpusRoot: string;
  pythonPath: string;
  lastRun: GraphifyRunCost | null;
}

// graphify writes both .graphify_root and .graphify_python next to graph.json
// on every build (SKILL.md Step 1 and the build steps that follow it). Their
// absence means graphJsonPath wasn't produced by graphify (or predates these
// sidecars) — skip registry bookkeeping entirely rather than guess.
export async function resolveGraphifyMetadata(graphJsonPath: string): Promise<GraphifyMetadata | null> {
  const graphifyOutDir = dirname(graphJsonPath);
  let corpusRoot: string;
  let pythonPath: string;
  try {
    corpusRoot = (await readFile(join(graphifyOutDir, ".graphify_root"), "utf-8")).trim();
    pythonPath = (await readFile(join(graphifyOutDir, ".graphify_python"), "utf-8")).trim();
  } catch {
    return null;
  }

  let lastRun: GraphifyRunCost | null = null;
  try {
    const cost = JSON.parse(await readFile(join(graphifyOutDir, "cost.json"), "utf-8")) as {
      runs?: { input_tokens: number; output_tokens: number; files: number }[];
    };
    const last = cost.runs?.[cost.runs.length - 1];
    if (last) lastRun = { inputTokens: last.input_tokens, outputTokens: last.output_tokens, files: last.files };
  } catch {
    lastRun = null; // no cost.json yet (never studied) — proceed without it
  }

  return { corpusRoot, pythonPath, lastRun };
}

export interface UpsertStudiedPathParams {
  corpusRoot: string;
  graphifyOutPath: string;
  inputTokens: number;
  outputTokens: number;
  durationSeconds?: number;
}

export async function upsertStudiedPath(db: Database, params: UpsertStudiedPathParams): Promise<void> {
  const properties: Record<string, unknown> = {
    gid: params.corpusRoot,
    graphify_out_path: params.graphifyOutPath,
    last_studied_at: new Date().toISOString(),
    last_input_tokens: params.inputTokens,
    last_output_tokens: params.outputTokens,
    // Always written, null included: leaving it unset on a sync without a
    // duration would carry the PREVIOUS run's duration forward next to a fresh
    // last_studied_at, reading as though it described the latest run.
    last_duration_seconds: params.durationSeconds ?? null,
    _brain_source: "study-registry",
  };

  await db.write(async (txn) => {
    const rows = (
      await txn.query("MATCH (n:StudiedPath) WHERE n.gid = $gid RETURN id(n) AS id", { gid: params.corpusRoot })
    ).rows as { id: bigint }[];
    if (rows.length === 0) {
      await txn.createNode({ labels: ["StudiedPath"], properties: properties as never });
      return;
    }
    for (const [key, value] of Object.entries(properties)) {
      await txn.setProperty(rows[0]!.id, key, value as never);
    }
  });
}

export interface StudiedPathRecord {
  corpusRoot: string;
  graphifyOutPath: string;
  lastStudiedAt: string;
  lastInputTokens: number;
  lastOutputTokens: number;
  lastDurationSeconds: number | null;
}

const RECORD_QUERY_FIELDS =
  "n.gid AS corpusRoot, n.graphify_out_path AS graphifyOutPath, n.last_studied_at AS lastStudiedAt, " +
  "n.last_input_tokens AS lastInputTokens, n.last_output_tokens AS lastOutputTokens, " +
  "n.last_duration_seconds AS lastDurationSeconds";

function toRecord(row: Record<string, unknown>): StudiedPathRecord {
  return {
    corpusRoot: row.corpusRoot as string,
    graphifyOutPath: row.graphifyOutPath as string,
    lastStudiedAt: row.lastStudiedAt as string,
    lastInputTokens: Number(row.lastInputTokens),
    lastOutputTokens: Number(row.lastOutputTokens),
    lastDurationSeconds: row.lastDurationSeconds != null ? Number(row.lastDurationSeconds) : null,
  };
}

export async function listStudiedPaths(db: Database): Promise<StudiedPathRecord[]> {
  const result = await db.query(`MATCH (n:StudiedPath) RETURN ${RECORD_QUERY_FIELDS}`);
  return result.rows.map((row) => toRecord(row as Record<string, unknown>));
}

export async function getStudiedPath(db: Database, corpusRoot: string): Promise<StudiedPathRecord | null> {
  const result = await db.query(`MATCH (n:StudiedPath) WHERE n.gid = $gid RETURN ${RECORD_QUERY_FIELDS}`, {
    gid: corpusRoot,
  });
  const row = result.rows[0];
  return row ? toRecord(row as Record<string, unknown>) : null;
}
