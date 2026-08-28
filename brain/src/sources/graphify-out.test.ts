import { expect, test } from "bun:test";
import { Database } from "@hajewski/latticedb";
import { readGraphifyOut, graphifyOutAdapter } from "./graphify-out";
import { syncSource } from "../learn-from";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FIXTURE = {
  directed: false,
  multigraph: true,
  graph: {},
  built_at_commit: "abc123",
  nodes: [
    {
      id: "foo_bar",
      label: "bar()",
      file_type: "code",
      norm_label: "bar",
      source_file: "foo.py",
      source_location: "L10",
      community: 0,
      community_name: "foo.py",
    },
  ],
  links: [
    {
      source: "foo_bar",
      target: "foo_baz",
      relation: "calls",
      confidence: "EXTRACTED",
      confidence_score: 1.0,
      context: "call",
      source_file: "foo.py",
      source_location: "L11",
      weight: 1.0,
    },
  ],
  hyperedges: [
    {
      id: "grp1",
      label: "A grouping",
      nodes: ["foo_bar"],
      relation: "form",
      confidence: "EXTRACTED",
      confidence_score: 1.0,
      source_file: "foo.py",
    },
  ],
};

test("reads graph.json into a normalized SourceSnapshot, tags _brain_source", async () => {
  const dir = mkdtempSync(join(tmpdir(), "brain-test-"));
  writeFileSync(join(dir, "graph.json"), JSON.stringify(FIXTURE));

  const snapshot = await readGraphifyOut(join(dir, "graph.json"));

  // Node: label capitalized file_type + GraphifyNode, gid preserved, provenance stamped
  const node = snapshot.nodes.find((n) => n.gid === "foo_bar")!;
  expect(node.labels).toEqual(["Code", "GraphifyNode"]);
  expect(node.properties._brain_source).toBe("graphify-out");
  expect(node.properties.source_file).toBe("foo.py");
  expect(node.properties.id).toBeUndefined(); // id becomes gid, not a duplicate property
  expect(node.ftsText).toContain("bar");
  expect(node.ftsText).toContain("foo.py");

  // Edge: relation uppercased, endpoints as gids
  const edge = snapshot.edges.find((e) => e.type === "CALLS")!;
  expect(edge.sourceGid).toBe("foo_bar");
  expect(edge.targetGid).toBe("foo_baz");
  expect(edge.properties.confidence).toBe("EXTRACTED");

  // Hyperedge becomes a hub node + HYPEREDGE_MEMBER edges
  const hub = snapshot.nodes.find((n) => n.gid === "grp1")!;
  expect(hub.labels).toEqual(["Hyperedge"]);
  expect(hub.properties.label).toBe("A grouping");
  const memberEdge = snapshot.edges.find(
    (e) => e.type === "HYPEREDGE_MEMBER" && e.sourceGid === "grp1"
  )!;
  expect(memberEdge.targetGid).toBe("foo_bar");
});

test("throws a clear error when graph.json does not exist", async () => {
  await expect(readGraphifyOut("/nonexistent/graph.json")).rejects.toThrow(
    /graph\.json/
  );
});

// Regression test: graphifyOutAdapter used to always report name
// "graphify-out" regardless of graphJsonPath, so syncSource's existing-node
// diff (scoped by that name) treated every corpus as the same source —
// syncing a second corpus deleted the first corpus's nodes entirely.
test("two non-default corpora get distinct source scoping — resyncing one never deletes the other's nodes", async () => {
  const dirA = mkdtempSync(join(tmpdir(), "brain-corpus-a-"));
  const dirB = mkdtempSync(join(tmpdir(), "brain-corpus-b-"));
  writeFileSync(join(dirA, "graph.json"), JSON.stringify({ nodes: [{ id: "a1", label: "A One", file_type: "code" }], links: [] }));
  writeFileSync(join(dirB, "graph.json"), JSON.stringify({ nodes: [{ id: "b1", label: "B One", file_type: "code" }], links: [] }));

  const adapterA = graphifyOutAdapter(join(dirA, "graph.json"));
  const adapterB = graphifyOutAdapter(join(dirB, "graph.json"));
  expect(adapterA.name).not.toBe(adapterB.name);

  const db = new Database(":memory:", { create: true });
  await db.open();
  await syncSource(db, adapterA);
  await syncSource(db, adapterB);

  const rows = (await db.query("MATCH (n:Code) RETURN n.gid ORDER BY n.gid")).rows;
  expect(rows).toEqual([{ "n.gid": "a1" }, { "n.gid": "b1" }]);

  await db.close();
});

test("the default corpus (CLAUDE_PROJECT_DIR/graphify-out) keeps the legacy plain 'graphify-out' source tag", async () => {
  const projectDir = mkdtempSync(join(tmpdir(), "brain-default-corpus-"));
  const outDir = join(projectDir, "graphify-out");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "graph.json"), JSON.stringify({ nodes: [{ id: "n1", label: "N", file_type: "code" }], links: [] }));

  const prevProjectDir = process.env.CLAUDE_PROJECT_DIR;
  process.env.CLAUDE_PROJECT_DIR = projectDir;
  try {
    const adapter = graphifyOutAdapter(join(outDir, "graph.json"));
    expect(adapter.name).toBe("graphify-out");
    const snapshot = await adapter.read();
    expect(snapshot.nodes[0]!.properties._brain_source).toBe("graphify-out");
  } finally {
    if (prevProjectDir === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = prevProjectDir;
  }
});
