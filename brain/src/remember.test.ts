import { expect, test } from "bun:test";
import { Database } from "@hajewski/latticedb";
import { remember } from "./remember";
import { forget } from "./forget";

test("a standalone fact gets a Fact label, _brain_source, is full-text searchable, has no links", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();

  const result = await remember(db, "the garage door hangs and needs a manual power cycle");
  expect(result.links).toEqual([]);
  expect(typeof result.gid).toBe("string");

  const rows = (await db.query(
    "MATCH (n:Fact) WHERE n.gid = $gid RETURN labels(n) AS labels, n.text, n._brain_source",
    { gid: result.gid }
  )).rows;
  expect(rows).toEqual([{ labels: ["Fact"], "n.text": "the garage door hangs and needs a manual power cycle", "n._brain_source": "remember" }]);

  const ftsHits = await db.ftsSearch("garage door power cycle", { limit: 1 });
  expect(ftsHits.length).toBe(1);

  await db.close();
});

test("optional structured properties are stored alongside the text", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();

  const result = await remember(db, "prefer semicolons in project X", { category: "style-preference" });
  const rows = (await db.query("MATCH (n:Fact) WHERE n.gid = $gid RETURN n.category", { gid: result.gid })).rows;
  expect(rows).toEqual([{ "n.category": "style-preference" }]);

  await db.close();
});

test("a link entry that's an exact known gid links directly, no FTS score", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  await db.write(async (txn) => {
    await txn.createNode({ labels: ["Code"], properties: { gid: "ratgdo-integration", name: "ratgdo" } });
  });

  const result = await remember(db, "hangs and drops off WiFi entirely", {}, ["ratgdo-integration"]);
  expect(result.links).toEqual([{ input: "ratgdo-integration", resolvedGid: "ratgdo-integration" }]);

  const rows = (await db.query(
    "MATCH (f:Fact)-[e:ABOUT]->(n) WHERE f.gid = $gid RETURN n.gid, e._brain_source",
    { gid: result.gid }
  )).rows;
  expect(rows).toEqual([{ "n.gid": "ratgdo-integration", "e._brain_source": "remember" }]);

  await db.close();
});

test("a link entry with no exact gid match resolves via FTS top hit and reports its score", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();
  await db.write(async (txn) => {
    const n = await txn.createNode({ labels: ["Code"], properties: { gid: "ratgdo-integration", name: "ratgdo garage door integration" } });
    await txn.ftsIndex(n.id, "ratgdo garage door integration reliability");
  });

  const result = await remember(db, "power cycle it manually", {}, ["ratgdo garage door"]);
  expect(result.links.length).toBe(1);
  expect(result.links[0]!.input).toBe("ratgdo garage door");
  expect(result.links[0]!.resolvedGid).toBe("ratgdo-integration");
  expect(typeof result.links[0]!.score).toBe("number");

  await db.close();
});

test("a link search string with no match at all is silently omitted, not an error", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();

  const result = await remember(db, "some fact", {}, ["nothing in the brain matches this string"]);
  expect(result.links).toEqual([]);

  await db.close();
});

test("a search-string link never matches the fact's own just-created, just-indexed text", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();

  // The fact's own text would be a strong FTS match for this exact phrase —
  // proves link resolution runs against the graph as it was BEFORE this
  // fact was created, not after.
  const result = await remember(db, "unicorn cupcake festival details", {}, ["unicorn cupcake festival"]);
  expect(result.links).toEqual([]);

  await db.close();
});

test("a link search string that top-hits a since-forgotten node's stale FTS entry does not throw, and is omitted", async () => {
  const db = new Database(":memory:", { create: true });
  await db.open();

  // LatticeDB doesn't prune the FTS index on deleteNode, and forget is
  // delete+recreate even for a soft forget — so after forgetting a node,
  // an FTS search that used to top-hit it now returns a hit pointing at a
  // dead lattice id. This is exactly the "contradiction" workflow
  // remember/SKILL.md mandates: forget the superseded fact, then remember
  // the new one, where the new fact's link search-string likely still
  // matches the just-forgotten node's vocabulary.
  const original = await remember(db, "the parakeet migration job runs nightly at 2am");
  await forget(db, { type: "node", gid: original.gid });

  const result = await remember(db, "the parakeet migration job now runs at 3am", {}, ["parakeet migration job"]);
  expect(result.links).toEqual([]);

  await db.close();
});
