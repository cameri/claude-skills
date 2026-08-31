import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  diffSnapshots,
  fingerprintEntry,
  fingerprintFile,
  inferKind,
  isManifestFile,
  walkFiles,
} from "./lib/fingerprint.ts";

function makeTree(): string {
  const root = mkdtempSync(join(tmpdir(), "immune-fp-"));
  mkdirSync(join(root, "skills", "demo"), { recursive: true });
  mkdirSync(join(root, "skills", "demo", "hooks"), { recursive: true });
  mkdirSync(join(root, "skills", "demo", "node_modules", "evil-pkg"), { recursive: true });
  mkdirSync(join(root, "skills", "demo", ".git"), { recursive: true });
  writeFileSync(join(root, "skills", "demo", "SKILL.md"), "name: demo\n");
  writeFileSync(join(root, "skills", "demo", "hooks", "pre.sh"), "#!/bin/sh\necho hi\n");
  writeFileSync(join(root, "skills", "demo", "node_modules", "evil-pkg", "index.js"), "evil");
  writeFileSync(join(root, "skills", "demo", ".git", "config"), "ignored");
  return root;
}

describe("walkFiles", () => {
  test("walks files and skips node_modules and .git", () => {
    const root = makeTree();
    try {
      const files = walkFiles(join(root, "skills", "demo")).map((f) => f.slice(root.length));
      expect(files).toContain("/skills/demo/SKILL.md");
      expect(files).toContain("/skills/demo/hooks/pre.sh");
      expect(files.some((f) => f.includes("node_modules"))).toBe(false);
      expect(files.some((f) => f.includes(".git"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("fingerprintEntry", () => {
  test("is deterministic for identical trees", () => {
    const a = makeTree();
    const b = makeTree();
    try {
      expect(fingerprintEntry(join(a, "skills", "demo")).hash).toBe(
        fingerprintEntry(join(b, "skills", "demo")).hash,
      );
    } finally {
      rmSync(a, { recursive: true, force: true });
      rmSync(b, { recursive: true, force: true });
    }
  });

  test("detects changes to manifest files (SKILL.md)", () => {
    const root = makeTree();
    try {
      const entry = join(root, "skills", "demo");
      const before = fingerprintEntry(entry);
      writeFileSync(join(entry, "SKILL.md"), "name: demo\ndescription: changed\n");
      const after = fingerprintEntry(entry);
      expect(after.hash).not.toBe(before.hash);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("detects changes to hook scripts", () => {
    const root = makeTree();
    try {
      const entry = join(root, "skills", "demo");
      const before = fingerprintEntry(entry);
      writeFileSync(join(entry, "hooks", "pre.sh"), "#!/bin/sh\necho EXFILTRATE\n");
      const after = fingerprintEntry(entry);
      expect(after.hash).not.toBe(before.hash);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("still detects non-manifest changes (stat-based record)", () => {
    const root = makeTree();
    try {
      const entry = join(root, "skills", "demo");
      const before = fingerprintEntry(entry);
      writeFileSync(join(entry, "hooks", "pre.sh"), "#!/bin/sh\necho changed\n");
      // Force an mtime bump even in fast filesystems.
      const now = Date.now() + 2000;
      const { utimesSync } = require("node:fs") as typeof import("node:fs");
      utimesSync(join(entry, "hooks", "pre.sh"), new Date(now), new Date(now));
      const after = fingerprintEntry(entry);
      expect(after.hash).not.toBe(before.hash);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("node_modules churn does not change the fingerprint", () => {
    const root = makeTree();
    try {
      const entry = join(root, "skills", "demo");
      const before = fingerprintEntry(entry);
      writeFileSync(join(entry, "node_modules", "evil-pkg", "index.js"), "different");
      const after = fingerprintEntry(entry);
      expect(after.hash).toBe(before.hash);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("fingerprintFile", () => {
  test("hashes content", () => {
    const root = makeTree();
    try {
      const file = join(root, "skills", "demo", "SKILL.md");
      const before = fingerprintFile(file);
      writeFileSync(file, "name: changed\n");
      expect(fingerprintFile(file).hash).not.toBe(before.hash);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("diffSnapshots", () => {
  test("classifies added, changed, removed", () => {
    const prev = {
      "/a": { mtimeMs: 1, size: 1, hash: "h1" },
      "/b": { mtimeMs: 1, size: 1, hash: "old" },
      "/gone": { mtimeMs: 1, size: 1, hash: "h3" },
    };
    const next = {
      "/a": { mtimeMs: 1, size: 1, hash: "h1" },
      "/b": { mtimeMs: 2, size: 2, hash: "new" },
      "/c": { mtimeMs: 1, size: 1, hash: "h4" },
    };
    expect(diffSnapshots(prev, next)).toEqual({
      added: ["/c"],
      changed: ["/b"],
      removed: ["/gone"],
    });
  });
});

describe("isManifestFile", () => {
  test("recognizes manifest names and hooks paths", () => {
    expect(isManifestFile("SKILL.md")).toBe(true);
    expect(isManifestFile("sub/SKILL.md")).toBe(true);
    expect(isManifestFile("plugin.json")).toBe(true);
    expect(isManifestFile("hooks/pre.sh")).toBe(true);
    expect(isManifestFile("nested/hooks/stop.ts")).toBe(true);
    expect(isManifestFile("src/index.ts")).toBe(false);
    expect(isManifestFile("assets/logo.png")).toBe(false);
  });
});

describe("inferKind", () => {
  test("infers kind from path shape", () => {
    expect(inferKind("/home/u/.claude/plugins/cache/market/plugin")).toBe("plugin");
    expect(inferKind("/home/u/.claude/skills/my-skill")).toBe("skill");
    expect(inferKind("/home/u/.claude/hooks/pre")).toBe("hook");
    expect(inferKind("/home/u/.claude/settings.json")).toBe("hooks-config");
    expect(inferKind("/tmp/random")).toBe("other");
  });
});