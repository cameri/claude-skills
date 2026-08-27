import type { Database } from "@hajewski/latticedb";
import type { SourceAdapter, SourceNode, SourceEdge } from "./sources/types";

export interface SyncResult {
  source: string;
  nodesCreated: number;
  nodesUpdated: number;
  nodesDeleted: number;
  edgesCreated: number;
  edgesDeleted: number; // edges are never "updated" — see Step 3 note
}

interface ExistingNode {
  gid: string;
  latticeId: bigint;
  properties: Record<string, unknown>;
}
interface ExistingEdge {
  sourceGid: string;
  targetGid: string;
  type: string;
}

export async function syncSource(db: Database, adapter: SourceAdapter): Promise<SyncResult> {
  const snapshot = await adapter.read();

  // NOTE: id(n), properties(n), and type(e) were verified against a real
  // :memory: LatticeDB (v0.14.0) before trusting them here — see
  // learn-from.ts investigation notes in the task report. id(n) returns a
  // JS `bigint` (not `string`), which is why ExistingNode.latticeId below
  // is typed `bigint` — everything else in the brief's query text works
  // unmodified.
  const existingNodeRows = (
    await db.query(
      "MATCH (n) WHERE n._brain_source = $source RETURN id(n) AS latticeId, n.gid AS gid, properties(n) AS properties",
      { source: adapter.name }
    )
  ).rows as unknown as { latticeId: bigint; gid: string; properties: Record<string, unknown> }[];
  const existingNodes = new Map<string, ExistingNode>(
    existingNodeRows.map((r) => [r.gid, { gid: r.gid, latticeId: r.latticeId, properties: r.properties }])
  );

  const existingEdgeRows = (
    await db.query(
      "MATCH (a)-[e]->(b) WHERE e._brain_source = $source RETURN a.gid AS sourceGid, b.gid AS targetGid, type(e) AS type",
      { source: adapter.name }
    )
  ).rows as unknown as { sourceGid: string; targetGid: string; type: string }[];
  const existingEdgeKeys = new Set(existingEdgeRows.map((r) => edgeKey(r.sourceGid, r.targetGid, r.type)));

  const incomingNodesByGid = new Map(snapshot.nodes.map((n) => [n.gid, n]));
  const incomingEdgeKeys = new Set(
    snapshot.edges.map((e) => edgeKey(e.sourceGid, e.targetGid, e.type))
  );

  let nodesCreated = 0, nodesUpdated = 0, nodesDeleted = 0, edgesCreated = 0, edgesDeleted = 0;
  const latticeIdByGid = new Map<string, bigint>();
  for (const [gid, existing] of existingNodes) latticeIdByGid.set(gid, existing.latticeId);

  await db.write(async (txn) => {
    // Deletes: edges gone from the snapshot
    for (const e of existingEdgeRows) {
      if (!incomingEdgeKeys.has(edgeKey(e.sourceGid, e.targetGid, e.type))) {
        await txn.deleteEdge(
          latticeIdByGid.get(e.sourceGid)!,
          latticeIdByGid.get(e.targetGid)!,
          e.type
        );
        edgesDeleted++;
      }
    }
    // Deletes: nodes gone from the snapshot (after their edges are gone)
    for (const [gid, existing] of existingNodes) {
      if (!incomingNodesByGid.has(gid)) {
        await txn.deleteNode(existing.latticeId);
        nodesDeleted++;
      }
    }
    // Creates/updates: nodes
    for (const node of snapshot.nodes) {
      const existing = existingNodes.get(node.gid);
      if (!existing) {
        const created = await txn.createNode({ labels: node.labels, properties: { ...node.properties, gid: node.gid } });
        latticeIdByGid.set(node.gid, created.id);
        if (node.ftsText) await txn.ftsIndex(created.id, node.ftsText);
        nodesCreated++;
      } else if (!propertiesEqual(existing.properties, node.properties)) {
        for (const [key, value] of Object.entries(node.properties)) {
          await txn.setProperty(existing.latticeId, key, value as never);
        }
        if (node.ftsText) await txn.ftsIndex(existing.latticeId, node.ftsText);
        nodesUpdated++;
      }
    }
    // Creates: edges new in the snapshot (after all nodes above exist)
    for (const edge of snapshot.edges) {
      if (!existingEdgeKeys.has(edgeKey(edge.sourceGid, edge.targetGid, edge.type))) {
        await txn.createEdge(
          latticeIdByGid.get(edge.sourceGid)!,
          latticeIdByGid.get(edge.targetGid)!,
          edge.type,
          { properties: edge.properties as never }
        );
        edgesCreated++;
      }
    }
  });

  return { source: adapter.name, nodesCreated, nodesUpdated, nodesDeleted, edgesCreated, edgesDeleted };
}

function edgeKey(sourceGid: string, targetGid: string, type: string): string {
  return `${sourceGid} ${targetGid} ${type}`;
}

function propertiesEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const aKeys = Object.keys(a).filter((k) => k !== "gid");
  const bKeys = Object.keys(b).filter((k) => k !== "gid");
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]));
}
