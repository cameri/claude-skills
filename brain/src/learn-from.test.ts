import { describe, expect, test } from "bun:test";
import { Database } from "@hajewski/latticedb";
import { syncSource } from "./learn-from";
import type { SourceAdapter, SourceSnapshot } from "./sources/types";

function fakeAdapter(snapshots: SourceSnapshot[]): SourceAdapter {
  let i = 0;
  return {
    name: "fake-source",
    read: async () => snapshots[Math.min(i++, snapshots.length - 1)],
  };
}

const V1: SourceSnapshot = {
  nodes: [
    { gid: "a", labels: ["Thing"], properties: { name: "A", _brain_source: "fake-source" } },
    { gid: "b", labels: ["Thing"], properties: { name: "B", _brain_source: "fake-source" } },
  ],
  edges: [{ sourceGid: "a", targetGid: "b", type: "LINKS_TO", properties: { _brain_source: "fake-source" } }],
};

// V2: "a" changed (name updated), "b" gone, "c" new
const V2: SourceSnapshot = {
  nodes: [
    { gid: "a", labels: ["Thing"], properties: { name: "A-changed", _brain_source: "fake-source" } },
    { gid: "c", labels: ["Thing"], properties: { name: "C", _brain_source: "fake-source" } },
  ],
  edges: [{ sourceGid: "a", targetGid: "c", type: "LINKS_TO", properties: { _brain_source: "fake-source" } }],
};

test("first sync creates everything", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  const result = await syncSource(db, fakeAdapter([V1]));
  expect(result).toMatchObject({ nodesCreated: 2, nodesUpdated: 0, nodesDeleted: 0, edgesCreated: 1, edgesDeleted: 0 });

  const rows = (await db.query("MATCH (n:Thing) RETURN n.gid, n.name ORDER BY n.gid")).rows;
  expect(rows).toEqual([{ "n.gid": "a", "n.name": "A" }, { "n.gid": "b", "n.name": "B" }]);
  await db.close();
});

test("second sync updates changed properties, creates new, deletes gone — never touches other sources", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();

  // Seed a node from a DIFFERENT source that happens to share no gid with V1/V2 —
  // must survive both syncs untouched, proving mirror-and-delete is scoped by _brain_source.
  await db.write(async (txn) => {
    await txn.createNode({ labels: ["Thing"], properties: { gid: "z", name: "Z", _brain_source: "other-source" } });
  });

  const adapter = fakeAdapter([V1, V2]);
  await syncSource(db, adapter); // seeds a, b
  const result = await syncSource(db, adapter); // a updated, b deleted, c created

  expect(result).toMatchObject({ nodesCreated: 1, nodesUpdated: 1, nodesDeleted: 1, edgesCreated: 1, edgesDeleted: 1 });

  const rows = (await db.query(
    "MATCH (n:Thing) RETURN n.gid, n.name, n._brain_source ORDER BY n.gid"
  )).rows;
  expect(rows).toEqual([
    { "n.gid": "a", "n.name": "A-changed", "n._brain_source": "fake-source" },
    { "n.gid": "c", "n.name": "C", "n._brain_source": "fake-source" },
    { "n.gid": "z", "n.name": "Z", "n._brain_source": "other-source" }, // untouched
  ]);

  const edgeRows = (await db.query(
    "MATCH (a:Thing)-[e:LINKS_TO]->(b:Thing) RETURN a.gid, b.gid"
  )).rows;
  expect(edgeRows).toEqual([{ "a.gid": "a", "b.gid": "c" }]);

  await db.close();
});

test("unchanged numeric properties (integer weight, float confidence) never trigger spurious churn", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();

  // Integer node/edge properties round-trip through LatticeDB as JS bigint
  // (e.g. weight: 5 comes back as 5n from properties(n)/properties(e)),
  // while a source snapshot's properties are always plain JS numbers. A
  // naive value comparator can misdiagnose an unchanged integer property as
  // "changed" every sync, forever. This test proves a real no-op sync (same
  // snapshot, second time) produces zero creates/updates/deletes.
  const snapshot: SourceSnapshot = {
    nodes: [
      {
        gid: "a",
        labels: ["Thing"],
        properties: { name: "A", weight: 5, confidence_score: 0.9, _brain_source: "fake-source" },
      },
      { gid: "b", labels: ["Thing"], properties: { name: "B", _brain_source: "fake-source" } },
    ],
    edges: [
      {
        sourceGid: "a",
        targetGid: "b",
        type: "LINKS_TO",
        properties: { weight: 5, confidence_score: 0.9, _brain_source: "fake-source" },
      },
    ],
  };

  const adapter = fakeAdapter([snapshot, snapshot]);
  await syncSource(db, adapter); // first sync creates everything
  const result = await syncSource(db, adapter); // second sync: nothing changed

  expect(result).toMatchObject({
    nodesCreated: 0,
    nodesUpdated: 0,
    nodesDeleted: 0,
    edgesCreated: 0,
    edgesDeleted: 0,
  });

  await db.close();
});

test("edge property change with unchanged identity is not silently dropped — delete+recreate", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();

  const nodes = [
    { gid: "a", labels: ["Thing"], properties: { name: "A", _brain_source: "fake-source" } },
    { gid: "b", labels: ["Thing"], properties: { name: "B", _brain_source: "fake-source" } },
  ];
  const withWeight1: SourceSnapshot = {
    nodes,
    edges: [{ sourceGid: "a", targetGid: "b", type: "LINKS_TO", properties: { weight: 1, _brain_source: "fake-source" } }],
  };
  const withWeight2: SourceSnapshot = {
    nodes,
    edges: [{ sourceGid: "a", targetGid: "b", type: "LINKS_TO", properties: { weight: 2, _brain_source: "fake-source" } }],
  };

  const adapter = fakeAdapter([withWeight1, withWeight2]);
  await syncSource(db, adapter); // seeds a, b, edge with weight=1
  const result = await syncSource(db, adapter); // same (sourceGid, targetGid, type) identity, weight changes to 2

  expect(result).toMatchObject({ nodesCreated: 0, nodesUpdated: 0, nodesDeleted: 0, edgesCreated: 1, edgesDeleted: 1 });

  const edgeRows = (await db.query(
    "MATCH (a:Thing)-[e:LINKS_TO]->(b:Thing) RETURN a.gid, b.gid, e.weight"
  )).rows;
  expect(edgeRows).toEqual([{ "a.gid": "a", "b.gid": "b", "e.weight": 2n }]);

  await db.close();
});

test("syncing back to V1 after V2 deletes everything V2 added — round trip returns to the original state", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  const adapter = fakeAdapter([V1, V2, V1]);
  await syncSource(db, adapter);
  await syncSource(db, adapter);
  const result = await syncSource(db, adapter); // back to V1: delete c, recreate b, update a back

  expect(result).toMatchObject({ nodesCreated: 1, nodesUpdated: 1, nodesDeleted: 1 });
  const rows = (await db.query("MATCH (n:Thing) RETURN n.gid, n.name ORDER BY n.gid")).rows;
  expect(rows).toEqual([{ "n.gid": "a", "n.name": "A" }, { "n.gid": "b", "n.name": "B" }]);
  await db.close();
});
