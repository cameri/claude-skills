import { expect, test } from "bun:test";
import { runDetectIncremental } from "./detect-incremental";
import type { PythonExec } from "./python-exec";

test("runDetectIncremental builds the right argv and parses detect_incremental's JSON", async () => {
  let capturedArgs: string[] = [];
  const fakeExec: PythonExec = async (pythonPath, args) => {
    expect(pythonPath).toBe("/fake/python");
    capturedArgs = args;
    return {
      stdout: JSON.stringify({
        new_total: 2,
        deleted_files: ["gone.py"],
        new_files: { code: ["a.py"], document: ["b.md"] },
      }),
      stderr: "",
      exitCode: 0,
    };
  };

  const result = await runDetectIncremental("/fake/python", "/some/corpus", fakeExec);

  expect(capturedArgs[0]).toBe("-c");
  expect(capturedArgs[2]).toBe("/some/corpus");
  expect(result).toEqual({
    newTotal: 2,
    deletedFiles: ["gone.py"],
    newFilesByType: { code: ["a.py"], document: ["b.md"] },
  });
});

test("runDetectIncremental throws with stderr context on non-zero exit", async () => {
  const fakeExec: PythonExec = async () => ({ stdout: "", stderr: "ModuleNotFoundError: graphify", exitCode: 1 });
  await expect(runDetectIncremental("/fake/python", "/some/corpus", fakeExec)).rejects.toThrow(
    "ModuleNotFoundError: graphify"
  );
});

test("runDetectIncremental defaults missing new_files/deleted_files to empty", async () => {
  const fakeExec: PythonExec = async () => ({ stdout: JSON.stringify({ new_total: 0 }), stderr: "", exitCode: 0 });
  const result = await runDetectIncremental("/fake/python", "/some/corpus", fakeExec);
  expect(result).toEqual({ newTotal: 0, deletedFiles: [], newFilesByType: {} });
});
