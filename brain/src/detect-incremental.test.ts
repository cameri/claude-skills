import { expect, test } from "bun:test";
import { runDetectIncremental } from "./detect-incremental";
import type { PythonExec } from "./python-exec";

test("runDetectIncremental builds the right argv and parses detect_incremental's JSON", async () => {
  let capturedArgs: string[] = [];
  let capturedCwd: string | undefined;
  const fakeExec: PythonExec = async (pythonPath, args, cwd) => {
    expect(pythonPath).toBe("/fake/python");
    capturedArgs = args;
    capturedCwd = cwd;
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

  const result = await runDetectIncremental(
    "/fake/python",
    "/some/corpus",
    "/some/corpus/graphify-out/manifest.json",
    fakeExec
  );

  expect(capturedArgs[0]).toBe("-c");
  expect(capturedArgs[2]).toBe("/some/corpus");
  // The manifest path must reach detect_incremental as an explicit argument —
  // its own default is relative and would resolve against an arbitrary cwd.
  expect(capturedArgs[3]).toBe("/some/corpus/graphify-out/manifest.json");
  expect(capturedCwd).toBe("/some/corpus");
  expect(result).toEqual({
    newTotal: 2,
    deletedFiles: ["gone.py"],
    newFilesByType: { code: ["a.py"], document: ["b.md"] },
  });
});

test("runDetectIncremental throws with stderr context on non-zero exit", async () => {
  const fakeExec: PythonExec = async () => ({ stdout: "", stderr: "ModuleNotFoundError: graphify", exitCode: 1 });
  await expect(
    runDetectIncremental("/fake/python", "/some/corpus", "/some/corpus/graphify-out/manifest.json", fakeExec)
  ).rejects.toThrow("ModuleNotFoundError: graphify");
});

test("runDetectIncremental defaults missing new_files/deleted_files to empty", async () => {
  const fakeExec: PythonExec = async () => ({ stdout: JSON.stringify({ new_total: 0 }), stderr: "", exitCode: 0 });
  const result = await runDetectIncremental(
    "/fake/python",
    "/some/corpus",
    "/some/corpus/graphify-out/manifest.json",
    fakeExec
  );
  expect(result).toEqual({ newTotal: 0, deletedFiles: [], newFilesByType: {} });
});
