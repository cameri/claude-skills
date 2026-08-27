import { expect, test } from "bun:test";
import { resolveBrainPath, openBrain } from "./db";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("resolveBrainPath uses CLAUDE_PROJECT_DIR", () => {
  const prior = process.env.CLAUDE_PROJECT_DIR;
  process.env.CLAUDE_PROJECT_DIR = "/tmp/fake-workspace";
  expect(resolveBrainPath()).toBe("/tmp/fake-workspace/brain/knowledge.lattice");
  if (prior === undefined) delete process.env.CLAUDE_PROJECT_DIR;
  else process.env.CLAUDE_PROJECT_DIR = prior;
});

test("resolveBrainPath throws when CLAUDE_PROJECT_DIR is unset", () => {
  const prior = process.env.CLAUDE_PROJECT_DIR;
  delete process.env.CLAUDE_PROJECT_DIR;
  expect(() => resolveBrainPath()).toThrow(/CLAUDE_PROJECT_DIR/);
  if (prior !== undefined) process.env.CLAUDE_PROJECT_DIR = prior;
});

test("openBrain creates the db file and parent dir if missing", async () => {
  const dir = mkdtempSync(join(tmpdir(), "brain-db-test-"));
  const dbPath = join(dir, "nested", "knowledge.lattice");
  const db = await openBrain(dbPath);
  expect(db.isOpen()).toBe(true);
  await db.close();
});
