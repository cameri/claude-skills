import { expect, test } from "bun:test";
import { Database } from "@hajewski/latticedb";
import { forget } from "./forget";

test("permanent forget of a node deletes it and cascades its edges", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  await db.write(async (txn) => {
    const a = await txn.createNode({ labels: ["Thing"], properties: { gid: "a" } });
    const b = await txn.createNode({ labels: ["Thing"], properties: { gid: "b" } });
    await txn.createEdge(a.id, b.id, "RELATED_TO", {});
  });

  const result = await forget(db, { type: "node", gid: "a" }, true);
  expect(result.found).toBe(true);

  const nodes = (await db.query("MATCH (n:Thing) RETURN n.gid")).rows;
  expect(nodes).toEqual([{ "n.gid": "b" }]);
  const edges = (await db.query("MATCH (x)-[e]->(y) RETURN e")).rows;
  expect(edges).toEqual([]);

  await db.close();
});

test("permanent forget of a nonexistent node reports found: false, does nothing", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  const result = await forget(db, { type: "node", gid: "nope" }, true);
  expect(result).toEqual({ found: false, edgesAffected: 0 });
  await db.close();
});

test("permanent forget of an edge deletes only that edge, both nodes survive", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  await db.write(async (txn) => {
    const a = await txn.createNode({ labels: ["Thing"], properties: { gid: "a" } });
    const b = await txn.createNode({ labels: ["Thing"], properties: { gid: "b" } });
    await txn.createEdge(a.id, b.id, "RELATED_TO", {});
  });

  const result = await forget(db, { type: "edge", sourceGid: "a", targetGid: "b", edgeType: "RELATED_TO" }, true);
  expect(result.found).toBe(true);

  const nodes = (await db.query("MATCH (n:Thing) RETURN n.gid ORDER BY n.gid")).rows;
  expect(nodes).toEqual([{ "n.gid": "a" }, { "n.gid": "b" }]);
  const edges = (await db.query("MATCH (x)-[e]->(y) RETURN e")).rows;
  expect(edges).toEqual([]);

  await db.close();
});

test("soft forget of a node relabels it to Forgotten (replacing prior labels), preserves properties, stamps a tombstone", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  await db.write(async (txn) => {
    await txn.createNode({ labels: ["Code", "GraphifyNode"], properties: { gid: "a", name: "A" } });
  });

  const result = await forget(db, { type: "node", gid: "a" });
  expect(result.found).toBe(true);

  const rows = (await db.query(
    "MATCH (n) WHERE n.gid = 'a' RETURN labels(n) AS labels, n.name, n._forgotten"
  )).rows;
  expect(rows).toEqual([{ labels: ["Forgotten"], "n.name": "A", "n._forgotten": true }]);

  // Invisible to a typical label-scoped query — the whole point of the mechanism.
  const scoped = (await db.query("MATCH (n:GraphifyNode) RETURN n.gid")).rows;
  expect(scoped).toEqual([]);

  await db.close();
});

test("soft forget of a node recreates its edges (outgoing, incoming, and a self-loop deduped once) retyped FORGOTTEN with _original_type", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  await db.write(async (txn) => {
    const a = await txn.createNode({ labels: ["Thing"], properties: { gid: "a" } });
    const b = await txn.createNode({ labels: ["Thing"], properties: { gid: "b" } });
    const c = await txn.createNode({ labels: ["Thing"], properties: { gid: "c" } });
    await txn.createEdge(a.id, b.id, "CALLS", { properties: { weight: 1 } }); // outgoing
    await txn.createEdge(c.id, a.id, "IMPORTS", {}); // incoming
    await txn.createEdge(a.id, a.id, "SELF_REF", {}); // self-loop — must not be recreated twice
  });

  const result = await forget(db, { type: "node", gid: "a" });
  expect(result.edgesAffected).toBe(3);

  const edgeRows = (await db.query(
    "MATCH (x)-[e:FORGOTTEN]->(y) RETURN e._original_type AS originalType, e.weight AS weight ORDER BY originalType"
  )).rows;
  expect(edgeRows).toEqual([
    { originalType: "CALLS", weight: 1n },
    { originalType: "IMPORTS", weight: null },
    { originalType: "SELF_REF", weight: null },
  ]);

  await db.close();
});

test("soft-forgetting an already-soft-forgotten node preserves the TRUE original edge type, not FORGOTTEN", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  await db.write(async (txn) => {
    const a = await txn.createNode({ labels: ["Thing"], properties: { gid: "a" } });
    const b = await txn.createNode({ labels: ["Thing"], properties: { gid: "b" } });
    await txn.createEdge(a.id, b.id, "CALLS", {});
  });

  await forget(db, { type: "node", gid: "a" }); // first soft forget: CALLS -> FORGOTTEN, _original_type: "CALLS"
  await forget(db, { type: "node", gid: "a" }); // second: must not stamp _original_type: "FORGOTTEN"

  const edgeRows = (await db.query("MATCH (x)-[e:FORGOTTEN]->(y) RETURN e._original_type AS originalType")).rows;
  expect(edgeRows).toEqual([{ originalType: "CALLS" }]);

  await db.close();
});

test("soft forget of an edge retypes it to FORGOTTEN, both endpoint nodes untouched", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  await db.write(async (txn) => {
    const a = await txn.createNode({ labels: ["Thing"], properties: { gid: "a" } });
    const b = await txn.createNode({ labels: ["Thing"], properties: { gid: "b" } });
    await txn.createEdge(a.id, b.id, "CALLS", { properties: { weight: 1 } });
  });

  const result = await forget(db, { type: "edge", sourceGid: "a", targetGid: "b", edgeType: "CALLS" });
  expect(result).toEqual({ found: true, edgesAffected: 0 });

  const rows = (await db.query("MATCH (a:Thing)-[e]->(b:Thing) RETURN a.gid, type(e) AS type, e._original_type AS originalType, e.weight AS weight")).rows;
  expect(rows).toEqual([{ "a.gid": "a", type: "FORGOTTEN", originalType: "CALLS", weight: 1n }]);
  const nodeCount = (await db.query("MATCH (n:Thing) RETURN n.gid ORDER BY n.gid")).rows;
  expect(nodeCount).toEqual([{ "n.gid": "a" }, { "n.gid": "b" }]);

  await db.close();
});

test("soft forget of a nonexistent target reports found: false", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  const nodeResult = await forget(db, { type: "node", gid: "nope" });
  expect(nodeResult).toEqual({ found: false, edgesAffected: 0 });
  const edgeResult = await forget(db, { type: "edge", sourceGid: "a", targetGid: "b", edgeType: "CALLS" });
  expect(edgeResult).toEqual({ found: false, edgesAffected: 0 });
  await db.close();
});
