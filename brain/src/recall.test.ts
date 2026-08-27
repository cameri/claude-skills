import { describe, expect, test } from "bun:test";
import { Database } from "@hajewski/latticedb";
import { recall } from "./recall";

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
