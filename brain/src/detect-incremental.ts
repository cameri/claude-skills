import type { PythonExec } from "./python-exec";
import { spawnPython } from "./python-exec";

export interface DetectIncrementalResult {
  newTotal: number;
  deletedFiles: string[];
  newFilesByType: Record<string, string[]>;
}

const DETECT_SCRIPT = `
import json, sys
from pathlib import Path
from graphify.detect import detect_incremental
result = detect_incremental(Path(sys.argv[1]))
print(json.dumps({
    "new_total": result.get("new_total", 0),
    "deleted_files": list(result.get("deleted_files", [])),
    "new_files": result.get("new_files", {}),
}))
`;

export async function runDetectIncremental(
  pythonPath: string,
  corpusRoot: string,
  exec: PythonExec = spawnPython
): Promise<DetectIncrementalResult> {
  const { stdout, stderr, exitCode } = await exec(pythonPath, ["-c", DETECT_SCRIPT, corpusRoot]);
  if (exitCode !== 0) {
    throw new Error(`detect_incremental failed for ${corpusRoot}: ${stderr || stdout}`);
  }
  const parsed = JSON.parse(stdout) as {
    new_total?: number;
    deleted_files?: string[];
    new_files?: Record<string, string[]>;
  };
  return {
    newTotal: parsed.new_total ?? 0,
    deletedFiles: parsed.deleted_files ?? [],
    newFilesByType: parsed.new_files ?? {},
  };
}
