import { describe, expect, test } from "bun:test";
import { readGraphifyOut } from "./graphify-out";
import { mkdtempSync, writeFileSync } from "node:fs";
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
