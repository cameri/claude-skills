import type { PythonExec } from "./python-exec";
import { spawnPython } from "./python-exec";

export interface DetectIncrementalResult {
  newTotal: number;
  deletedFiles: string[];
  newFilesByType: Record<string, string[]>;
}

// sys.argv[2] is the manifest path. graphify's own detect_incremental defaults
// it to the RELATIVE "graphify-out/manifest.json", which resolves against the
// subprocess cwd — an MCP server's cwd is arbitrary, so the manifest would fail
// to load, load_manifest would swallow the error and return {}, and every path
// would report as 100% stale. Passing it explicitly also survives a non-standard
// graphify-out/ location.
const DETECT_SCRIPT = `
import json, sys
from pathlib import Path
from graphify.detect import detect_incremental
result = detect_incremental(Path(sys.argv[1]), sys.argv[2])
print(json.dumps({
    "new_total": result.get("new_total", 0),
    "deleted_files": list(result.get("deleted_files", [])),
    "new_files": result.get("new_files", {}),
}))
`;

export async function runDetectIncremental(
  pythonPath: string,
  corpusRoot: string,
  manifestPath: string,
  exec: PythonExec = spawnPython
): Promise<DetectIncrementalResult> {
  const { stdout, stderr, exitCode } = await exec(
    pythonPath,
    ["-c", DETECT_SCRIPT, corpusRoot, manifestPath],
    corpusRoot
  );
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
