import type { Database } from "@hajewski/latticedb";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { listStudiedPaths, getStudiedPath, type StudiedPathRecord } from "./study-registry";
import { runDetectIncremental as defaultRunDetectIncremental } from "./detect-incremental";

export interface StudyStatusResult {
  path: string;
  isStale: boolean;
  changedFiles: number;
  deletedFiles: number;
  needsLlm: boolean;
  estimatedInputTokens: number | null;
  estimatedOutputTokens: number | null;
  lastInputTokens: number;
  lastOutputTokens: number;
  lastStudiedAt: string;
  lastDurationSeconds: number | null;
  error?: string;
}

export interface StudyStatusDeps {
  runDetectIncremental: typeof defaultRunDetectIncremental;
}

const defaultDeps: StudyStatusDeps = { runDetectIncremental: defaultRunDetectIncremental };

function baseResult(record: StudiedPathRecord): Omit<StudyStatusResult, "isStale" | "changedFiles" | "deletedFiles" | "needsLlm" | "estimatedInputTokens" | "estimatedOutputTokens"> {
  return {
    path: record.corpusRoot,
    lastInputTokens: record.lastInputTokens,
    lastOutputTokens: record.lastOutputTokens,
    lastStudiedAt: record.lastStudiedAt,
    lastDurationSeconds: record.lastDurationSeconds,
  };
}

async function statusForOne(record: StudiedPathRecord, deps: StudyStatusDeps): Promise<StudyStatusResult> {
  const base = baseResult(record);
  const errored = (message: string): StudyStatusResult => ({
    ...base,
    isStale: false,
    changedFiles: 0,
    deletedFiles: 0,
    needsLlm: false,
    estimatedInputTokens: null,
    estimatedOutputTokens: null,
    error: message,
  });

  let pythonPath: string;
  try {
    pythonPath = (await readFile(join(record.graphifyOutPath, ".graphify_python"), "utf-8")).trim();
  } catch (err) {
    return errored(`Could not read .graphify_python at ${record.graphifyOutPath}: ${(err as Error).message}`);
  }

  let detected;
  try {
    detected = await deps.runDetectIncremental(
      pythonPath,
      record.corpusRoot,
      join(record.graphifyOutPath, "manifest.json")
    );
  } catch (err) {
    return errored((err as Error).message);
  }

  const isStale = detected.newTotal > 0 || detected.deletedFiles.length > 0;
  // Anything graphify does NOT categorise as "code" needs LLM-backed semantic
  // extraction. Inverted rather than listed, so a category graphify adds later
  // is handled without brain having to track graphify's own taxonomy.
  const needsLlm = Object.entries(detected.newFilesByType).some(
    ([type, files]) => type !== "code" && files.length > 0
  );

  let estimatedInputTokens: number | null = null;
  let estimatedOutputTokens: number | null = null;
  if (isStale) {
    try {
      const cost = JSON.parse(await readFile(join(record.graphifyOutPath, "cost.json"), "utf-8")) as {
        runs?: { input_tokens: number; output_tokens: number; files: number }[];
      };
      const lastRun = cost.runs?.[cost.runs.length - 1];
      if (lastRun && lastRun.files > 0) {
        estimatedInputTokens = Math.round((lastRun.input_tokens / lastRun.files) * detected.newTotal);
        estimatedOutputTokens = Math.round((lastRun.output_tokens / lastRun.files) * detected.newTotal);
      }
    } catch {
      // no cost.json yet (never actually studied, or file removed) — leave estimate null
    }
  }

  return {
    ...base,
    isStale,
    changedFiles: detected.newTotal,
    deletedFiles: detected.deletedFiles.length,
    needsLlm,
    estimatedInputTokens,
    estimatedOutputTokens,
  };
}

export async function studyStatus(
  db: Database,
  path?: string,
  deps: StudyStatusDeps = defaultDeps
): Promise<StudyStatusResult[]> {
  const records =
    path !== undefined
      ? await getStudiedPath(db, path).then((r) => (r ? [r] : []))
      : await listStudiedPaths(db);
  return Promise.all(records.map((record) => statusForOne(record, deps)));
}
