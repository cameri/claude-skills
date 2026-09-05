import { test, expect } from "bun:test";
import { resolve } from "node:path";
import { resolveClaudeBaseDir } from "../paths.ts";

test("defaults to ~/.claude when CLAUDE_CONFIG_DIR is unset", () => {
  expect(resolveClaudeBaseDir({}, "/home/node")).toBe("/home/node/.claude");
});

test("uses CLAUDE_CONFIG_DIR exclusively when set", () => {
  expect(resolveClaudeBaseDir({ CLAUDE_CONFIG_DIR: "/home/node/.flock-homes/deploy" }, "/home/node"))
    .toBe("/home/node/.flock-homes/deploy");
});

test("resolves relative CLAUDE_CONFIG_DIR to absolute", () => {
  expect(resolveClaudeBaseDir({ CLAUDE_CONFIG_DIR: ".flock-homes/deploy" }, "/home/node"))
    .toBe(resolve(".flock-homes/deploy"));
});

test("never merges: override does not fall back to ~/.claude pieces", () => {
  const base = resolveClaudeBaseDir({ CLAUDE_CONFIG_DIR: "/a" }, "/home/node");
  expect(base.startsWith("/home/node/.claude")).toBe(false);
});
