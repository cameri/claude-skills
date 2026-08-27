import { expect, test } from "bun:test";
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

test("an edge referencing a gid with no corresponding node is skipped, not fatal to the whole sync", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();

  // "b" points at "ghost", which has no node in this snapshot at all — the
  // SourceAdapter contract allows this (a real graphify extraction can
  // produce it). Before the fix, the non-null assertion on the missing
  // lattice id would pass `undefined` into the native FFI layer and blow up
  // the entire db.write() transaction, rolling back node "a" too.
  const snapshot: SourceSnapshot = {
    nodes: [
      { gid: "a", labels: ["Thing"], properties: { name: "A", _brain_source: "fake-source" } },
      { gid: "b", labels: ["Thing"], properties: { name: "B", _brain_source: "fake-source" } },
    ],
    edges: [
      { sourceGid: "a", targetGid: "b", type: "LINKS_TO", properties: { _brain_source: "fake-source" } },
      { sourceGid: "b", targetGid: "ghost", type: "LINKS_TO", properties: { _brain_source: "fake-source" } },
    ],
  };

  const result = await syncSource(db, fakeAdapter([snapshot]));

  // The valid node/edge are still created — one bad edge doesn't abort
  // everything — and the dangling one is counted, not silently dropped.
  expect(result).toMatchObject({
    nodesCreated: 2,
    nodesUpdated: 0,
    nodesDeleted: 0,
    edgesCreated: 1,
    edgesDeleted: 0,
    edgesSkipped: 1,
  });

  const rows = (await db.query("MATCH (n:Thing) RETURN n.gid ORDER BY n.gid")).rows;
  expect(rows).toEqual([{ "n.gid": "a" }, { "n.gid": "b" }]);

  const edgeRows = (await db.query("MATCH (a:Thing)-[e:LINKS_TO]->(b:Thing) RETURN a.gid, b.gid")).rows;
  expect(edgeRows).toEqual([{ "a.gid": "a", "b.gid": "b" }]);

  await db.close();
});

test("removing a property is a true no-op on the sync AFTER the removal sync — no permanent churn", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();

  const withProp: SourceSnapshot = {
    nodes: [{ gid: "a", labels: ["Thing"], properties: { name: "A", note: "temp", _brain_source: "fake-source" } }],
    edges: [],
  };
  const withoutProp: SourceSnapshot = {
    nodes: [{ gid: "a", labels: ["Thing"], properties: { name: "A", _brain_source: "fake-source" } }],
    edges: [],
  };

  const adapter = fakeAdapter([withProp, withoutProp, withoutProp]);
  await syncSource(db, adapter); // sync 1: creates "a" with note="temp"
  const removalResult = await syncSource(db, adapter); // sync 2: "note" removed at the source — best-effort nulled out
  expect(removalResult).toMatchObject({ nodesCreated: 0, nodesUpdated: 1, nodesDeleted: 0 });

  // sync 3: source snapshot is IDENTICAL to sync 2's (property still
  // absent) — nothing has actually changed since the removal. Before the
  // fix, propertiesEqual's raw key-count comparison permanently saw the
  // nulled "note" key (still reported by properties(n)) as one more key
  // than the incoming snapshot, misdiagnosing this as "changed" forever.
  const noopResult = await syncSource(db, adapter);
  expect(noopResult).toMatchObject({ nodesCreated: 0, nodesUpdated: 0, nodesDeleted: 0 });

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

test("a soft-forgotten node (tombstone property set) is never touched by a resync, even though its properties differ from the source", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();

  const snapshot: SourceSnapshot = {
    nodes: [{ gid: "a", labels: ["Thing"], properties: { name: "A", _brain_source: "fake-source" } }],
    edges: [],
  };
  await syncSource(db, fakeAdapter([snapshot])); // creates "a"

  // Simulate what forget's soft-delete does: relabel + stamp _forgotten,
  // by hand — this test must not depend on forget.ts existing yet.
  await db.write(async (txn) => {
    const rows = (await db.query("MATCH (n) WHERE n.gid = 'a' RETURN id(n) AS id")).rows;
    const id = (rows[0] as { id: bigint }).id;
    await txn.deleteNode(id);
    await txn.createNode({
      labels: ["Forgotten"],
      properties: { gid: "a", name: "A", _brain_source: "fake-source", _forgotten: true, _forgotten_at: "2026-08-27T00:00:00.000Z" },
    });
  });

  // Resync against the UNCHANGED source snapshot — before the fix, the
  // property diff sees `_forgotten`/`_forgotten_at` present on the existing
  // node but absent from the source, treats them as "removed", and nulls
  // them out, silently erasing the tombstone.
  const result = await syncSource(db, fakeAdapter([snapshot]));
  expect(result).toMatchObject({ nodesCreated: 0, nodesUpdated: 0, nodesDeleted: 0 });

  const rows = (await db.query("MATCH (n) WHERE n.gid = 'a' RETURN labels(n) AS labels, n._forgotten")).rows;
  expect(rows).toEqual([{ labels: ["Forgotten"], "n._forgotten": true }]);

  await db.close();
});

test("a soft-forgotten edge (retyped to FORGOTTEN with _original_type) is never touched by a resync — not deleted, not duplicated under its original type", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();

  const snapshot: SourceSnapshot = {
    nodes: [
      { gid: "a", labels: ["Thing"], properties: { name: "A", _brain_source: "fake-source" } },
      { gid: "b", labels: ["Thing"], properties: { name: "B", _brain_source: "fake-source" } },
    ],
    edges: [{ sourceGid: "a", targetGid: "b", type: "CALLS", properties: { _brain_source: "fake-source" } }],
  };
  await syncSource(db, fakeAdapter([snapshot])); // creates a, b, a-CALLS->b

  // Simulate what forget's soft-delete does to an edge directly, by hand.
  await db.write(async (txn) => {
    const rows = (await db.query(
      "MATCH (a:Thing)-[e:CALLS]->(b:Thing) WHERE a.gid='a' AND b.gid='b' RETURN id(a) AS aid, id(b) AS bid, properties(e) AS props"
    )).rows as { aid: bigint; bid: bigint; props: Record<string, unknown> }[];
    const { aid, bid, props } = rows[0]!;
    await txn.deleteEdge(aid, bid, "CALLS");
    await txn.createEdge(aid, bid, "FORGOTTEN", { properties: { ...props, _forgotten: true, _original_type: "CALLS" } as never });
  });

  const result = await syncSource(db, fakeAdapter([snapshot]));
  expect(result).toMatchObject({ nodesCreated: 0, nodesUpdated: 0, nodesDeleted: 0, edgesCreated: 0, edgesDeleted: 0 });

  const edgeRows = (await db.query("MATCH (a:Thing)-[e]->(b:Thing) RETURN a.gid, type(e) AS type, b.gid")).rows;
  expect(edgeRows).toEqual([{ "a.gid": "a", type: "FORGOTTEN", "b.gid": "b" }]);

  await db.close();
});
