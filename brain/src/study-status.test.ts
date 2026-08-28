import { expect, test } from "bun:test";
import { Database } from "@hajewski/latticedb";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { upsertStudiedPath } from "./study-registry";
import { studyStatus } from "./study-status";
import type { DetectIncrementalResult } from "./detect-incremental";

async function seedPath(db: Database, corpusRoot: string, graphifyOutPath: string) {
  await upsertStudiedPath(db, { corpusRoot, graphifyOutPath, inputTokens: 1000, outputTokens: 200, durationSeconds: 30 });
}

test("a stale, code-only path: no LLM needed, cost estimated from the last cost.json run", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  const graphifyOutDir = mkdtempSync(join(tmpdir(), "study-status-test-"));
  writeFileSync(join(graphifyOutDir, ".graphify_python"), "/usr/bin/python3");
  writeFileSync(
    join(graphifyOutDir, "cost.json"),
    JSON.stringify({ runs: [{ date: "2026-08-27T00:00:00Z", input_tokens: 1000, output_tokens: 200, files: 10 }] })
  );
  await seedPath(db, "/some/corpus", graphifyOutDir);

  const fakeResult: DetectIncrementalResult = { newTotal: 5, deletedFiles: [], newFilesByType: { code: ["a.ts", "b.ts"] } };
  const results = await studyStatus(db, "/some/corpus", { runDetectIncremental: async () => fakeResult });

  expect(results).toEqual([
    {
      path: "/some/corpus",
      isStale: true,
      changedFiles: 5,
      deletedFiles: 0,
      needsLlm: false,
      estimatedInputTokens: 500, // (1000/10) * 5
      estimatedOutputTokens: 100, // (200/10) * 5
      lastInputTokens: 1000,
      lastOutputTokens: 200,
      lastStudiedAt: results[0]!.lastStudiedAt,
      lastDurationSeconds: 30,
    },
  ]);
  await db.close();
});

test("changed docs/papers/images set needsLlm true", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  const graphifyOutDir = mkdtempSync(join(tmpdir(), "study-status-test-"));
  writeFileSync(join(graphifyOutDir, ".graphify_python"), "/usr/bin/python3");
  await seedPath(db, "/some/corpus", graphifyOutDir);

  const fakeResult: DetectIncrementalResult = {
    newTotal: 1,
    deletedFiles: [],
    newFilesByType: { document: ["notes.md"] },
  };
  const results = await studyStatus(db, "/some/corpus", { runDetectIncremental: async () => fakeResult });
  expect(results[0]!.needsLlm).toBe(true);
});

test("not stale: newTotal 0 and no deletions", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  const graphifyOutDir = mkdtempSync(join(tmpdir(), "study-status-test-"));
  writeFileSync(join(graphifyOutDir, ".graphify_python"), "/usr/bin/python3");
  await seedPath(db, "/some/corpus", graphifyOutDir);

  const fakeResult: DetectIncrementalResult = { newTotal: 0, deletedFiles: [], newFilesByType: {} };
  const results = await studyStatus(db, "/some/corpus", { runDetectIncremental: async () => fakeResult });
  expect(results[0]!.isStale).toBe(false);
  expect(results[0]!.estimatedInputTokens).toBeNull();
  expect(results[0]!.estimatedOutputTokens).toBeNull();
});

test("no cost.json yet: stale but cost estimate is null, not a crash", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  const graphifyOutDir = mkdtempSync(join(tmpdir(), "study-status-test-"));
  writeFileSync(join(graphifyOutDir, ".graphify_python"), "/usr/bin/python3");
  await seedPath(db, "/some/corpus", graphifyOutDir);

  const fakeResult: DetectIncrementalResult = { newTotal: 3, deletedFiles: [], newFilesByType: { code: ["a.ts"] } };
  const results = await studyStatus(db, "/some/corpus", { runDetectIncremental: async () => fakeResult });
  expect(results[0]!.isStale).toBe(true);
  expect(results[0]!.estimatedInputTokens).toBeNull();
});

test("missing .graphify_python reports a per-path error, does not throw", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  const graphifyOutDir = mkdtempSync(join(tmpdir(), "study-status-test-"));
  // no .graphify_python written
  await seedPath(db, "/some/corpus", graphifyOutDir);

  const results = await studyStatus(db, "/some/corpus", {
    runDetectIncremental: async () => {
      throw new Error("should not be called");
    },
  });
  expect(results[0]!.error).toContain(".graphify_python");
  await db.close();
});

test("runDetectIncremental throwing is reported as a per-path error", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  const graphifyOutDir = mkdtempSync(join(tmpdir(), "study-status-test-"));
  writeFileSync(join(graphifyOutDir, ".graphify_python"), "/usr/bin/python3");
  await seedPath(db, "/some/corpus", graphifyOutDir);

  const results = await studyStatus(db, "/some/corpus", {
    runDetectIncremental: async () => {
      throw new Error("manifest.json is corrupt");
    },
  });
  expect(results[0]!.error).toBe("manifest.json is corrupt");
  await db.close();
});

test("no path argument reports every registered path", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  const dirA = mkdtempSync(join(tmpdir(), "study-status-test-a-"));
  const dirB = mkdtempSync(join(tmpdir(), "study-status-test-b-"));
  writeFileSync(join(dirA, ".graphify_python"), "/usr/bin/python3");
  writeFileSync(join(dirB, ".graphify_python"), "/usr/bin/python3");
  await seedPath(db, "/corpus/a", dirA);
  await seedPath(db, "/corpus/b", dirB);

  const results = await studyStatus(db, undefined, {
    runDetectIncremental: async () => ({ newTotal: 0, deletedFiles: [], newFilesByType: {} }),
  });
  expect(results.map((r) => r.path).sort()).toEqual(["/corpus/a", "/corpus/b"]);
  await db.close();
});

test("an unregistered path returns an empty array, not a throw", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  const results = await studyStatus(db, "/never/studied");
  expect(results).toEqual([]);
  await db.close();
});
