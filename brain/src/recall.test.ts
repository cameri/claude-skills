import { expect, test } from "bun:test";
import { Database } from "@hajewski/latticedb";
import { recall } from "./recall";
import { jsonStringify } from "./json";

test("recall runs a literal Cypher query and returns rows", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  await db.write(async (txn) => {
    await txn.createNode({ labels: ["Thing"], properties: { name: "A" } });
  });
  const result = await recall(db, "MATCH (n:Thing) RETURN n.name");
  expect(result.rows).toEqual([{ "n.name": "A" }]);
  await db.close();
});

test("recall surfaces a Cypher syntax error clearly rather than swallowing it", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  await expect(recall(db, "NOT VALID CYPHER")).rejects.toThrow();
  await db.close();
});

test("rows with bigint-valued properties (e.g. an integer or count()) do not throw on serialization", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  await db.write(async (txn) => {
    await txn.createNode({ labels: ["Thing"], properties: { name: "A", weight: 5 } });
  });

  // LatticeDB round-trips integer-valued properties as JS `bigint` (e.g.
  // weight: 5 comes back as 5n from n.weight, and count() aggregations
  // return bigint too). The raw `JSON.stringify` the MCP tool handler used
  // to call throws a TypeError on bigint with no replacer — this is the
  // bug: reproduce it at the layer where it actually surfaces (a real
  // recall() result), not just on a synthetic bigint literal.
  const result = await recall(db, "MATCH (n:Thing) RETURN n.name, n.weight, count(n) AS c");
  expect(result.rows).toEqual([{ "n.name": "A", "n.weight": 5n, c: 1n }]);

  // Plain JSON.stringify throws here — that's the bug this test guards.
  expect(() => JSON.stringify(result)).toThrow(TypeError);

  // jsonStringify (the fix) must not throw, and must render bigints as
  // plain decimal text.
  expect(() => jsonStringify(result)).not.toThrow();
  expect(jsonStringify(result)).toBe('{"rows":[{"n.name":"A","n.weight":"5","c":"1"}]}');

  await db.close();
});
