import { expect, test } from "bun:test";
import { Database } from "@hajewski/latticedb";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveGraphifyMetadata, upsertStudiedPath, listStudiedPaths, getStudiedPath } from "./study-registry";

test("resolveGraphifyMetadata reads .graphify_root, .graphify_python, and the latest cost.json run", async () => {
  const graphifyOutDir = mkdtempSync(join(tmpdir(), "study-registry-test-"));
  writeFileSync(join(graphifyOutDir, ".graphify_root"), "/some/corpus\n");
  writeFileSync(join(graphifyOutDir, ".graphify_python"), "/usr/bin/python3\n");
  writeFileSync(
    join(graphifyOutDir, "cost.json"),
    JSON.stringify({
      runs: [
        { date: "2026-08-01T00:00:00Z", input_tokens: 1000, output_tokens: 200, files: 10 },
        { date: "2026-08-27T00:00:00Z", input_tokens: 500, output_tokens: 100, files: 5 },
      ],
    })
  );

  const metadata = await resolveGraphifyMetadata(join(graphifyOutDir, "graph.json"));
  expect(metadata).toEqual({
    corpusRoot: "/some/corpus",
    pythonPath: "/usr/bin/python3",
    lastRun: { inputTokens: 500, outputTokens: 100, files: 5 },
  });
});

test("resolveGraphifyMetadata returns null when .graphify_root is missing", async () => {
  const graphifyOutDir = mkdtempSync(join(tmpdir(), "study-registry-test-"));
  const metadata = await resolveGraphifyMetadata(join(graphifyOutDir, "graph.json"));
  expect(metadata).toBeNull();
});

test("resolveGraphifyMetadata tolerates a missing cost.json (lastRun: null)", async () => {
  const graphifyOutDir = mkdtempSync(join(tmpdir(), "study-registry-test-"));
  writeFileSync(join(graphifyOutDir, ".graphify_root"), "/some/corpus");
  writeFileSync(join(graphifyOutDir, ".graphify_python"), "/usr/bin/python3");

  const metadata = await resolveGraphifyMetadata(join(graphifyOutDir, "graph.json"));
  expect(metadata).toEqual({ corpusRoot: "/some/corpus", pythonPath: "/usr/bin/python3", lastRun: null });
});

test("upsertStudiedPath creates then updates a StudiedPath node, listStudiedPaths/getStudiedPath read it back", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();

  await upsertStudiedPath(db, {
    corpusRoot: "/some/corpus",
    graphifyOutPath: "/some/corpus/graphify-out",
    inputTokens: 500,
    outputTokens: 100,
  });

  let record = await getStudiedPath(db, "/some/corpus");
  expect(record?.lastInputTokens).toBe(500);
  expect(record?.lastDurationSeconds).toBeNull();

  await upsertStudiedPath(db, {
    corpusRoot: "/some/corpus",
    graphifyOutPath: "/some/corpus/graphify-out",
    inputTokens: 700,
    outputTokens: 150,
    durationSeconds: 42,
  });

  record = await getStudiedPath(db, "/some/corpus");
  expect(record?.lastInputTokens).toBe(700);
  expect(record?.lastDurationSeconds).toBe(42);

  const all = await listStudiedPaths(db);
  expect(all.length).toBe(1); // upsert updated in place, did not create a second node
  expect(all[0]?.corpusRoot).toBe("/some/corpus");

  await db.close();
});

test("getStudiedPath returns null for an unregistered path", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  expect(await getStudiedPath(db, "/never/studied")).toBeNull();
  await db.close();
});
