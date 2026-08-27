import type { Database } from "@hajewski/latticedb";

export type ForgetTarget =
  | { type: "node"; gid: string }
  | { type: "edge"; sourceGid: string; targetGid: string; edgeType: string };

export interface ForgetResult {
  found: boolean;
  edgesAffected: number;
}

export async function forget(db: Database, target: ForgetTarget, permanent: boolean = false): Promise<ForgetResult> {
  if (target.type === "node") {
    return permanent ? forgetNodePermanent(db, target.gid) : forgetNodeSoft(db, target.gid);
  }
  return permanent ? forgetEdgePermanent(db, target) : forgetEdgeSoft(db, target);
}

async function forgetNodePermanent(db: Database, gid: string): Promise<ForgetResult> {
  return db.write(async (txn) => {
    const rows = (await txn.query("MATCH (n) WHERE n.gid = $gid RETURN id(n) AS id", { gid })).rows as { id: bigint }[];
    if (rows.length === 0) return { found: false, edgesAffected: 0 };
    await txn.deleteNode(rows[0]!.id); // cascades edge deletion — confirmed empirically
    return { found: true, edgesAffected: 0 };
  });
}

async function forgetEdgePermanent(
  db: Database,
  target: { sourceGid: string; targetGid: string; edgeType: string }
): Promise<ForgetResult> {
  return db.write(async (txn) => {
    const rows = (
      await txn.query(
        "MATCH (a)-[e]->(b) WHERE a.gid = $sourceGid AND b.gid = $targetGid AND type(e) = $edgeType RETURN id(a) AS sourceId, id(b) AS targetId",
        target
      )
    ).rows as { sourceId: bigint; targetId: bigint }[];
    if (rows.length === 0) return { found: false, edgesAffected: 0 };
    await txn.deleteEdge(rows[0]!.sourceId, rows[0]!.targetId, target.edgeType);
    return { found: true, edgesAffected: 0 };
  });
}

async function forgetNodeSoft(db: Database, gid: string): Promise<ForgetResult> {
  return db.write(async (txn) => {
    const rows = (
      await txn.query("MATCH (n) WHERE n.gid = $gid RETURN id(n) AS id, properties(n) AS properties", { gid })
    ).rows as { id: bigint; properties: Record<string, unknown> }[];
    if (rows.length === 0) return { found: false, edgesAffected: 0 };
    const { id, properties } = rows[0]!;

    // getOutgoingEdges/getIncomingEdges return edges whose `properties` is
    // always `{}` regardless of what's stored (same gotcha as
    // txn.getNode() — confirmed empirically), so edge properties (e.g.
    // `weight`) are fetched via a Cypher `properties(e)` query instead. The
    // `WHERE id(n) = $id OR id(m) = $id` form also sidesteps the need to
    // separately dedupe a self-loop: a self-loop edge (n and m both equal
    // `id`) is matched by the single (n)-[e]->(m) pattern exactly once.
    const edgeRows = (
      await txn.query(
        "MATCH (n)-[e]->(m) WHERE id(n) = $id OR id(m) = $id RETURN id(n) AS sourceId, id(m) AS targetId, type(e) AS type, properties(e) AS properties",
        { id }
      )
    ).rows as unknown as { sourceId: bigint; targetId: bigint; type: string; properties: Record<string, unknown> }[];

    await txn.deleteNode(id); // cascades all its edges
    const recreated = await txn.createNode({
      labels: ["Forgotten"],
      properties: { ...properties, _forgotten: true, _forgotten_at: new Date().toISOString() },
    });

    let edgesAffected = 0;
    for (const e of edgeRows) {
      const newSourceId = e.sourceId === id ? recreated.id : e.sourceId;
      const newTargetId = e.targetId === id ? recreated.id : e.targetId;
      const originalType = e.properties._original_type ?? e.type;
      await txn.createEdge(newSourceId, newTargetId, "FORGOTTEN", {
        properties: { ...e.properties, _forgotten: true, _original_type: originalType } as never,
      });
      edgesAffected++;
    }
    return { found: true, edgesAffected };
  });
}

async function forgetEdgeSoft(
  db: Database,
  target: { sourceGid: string; targetGid: string; edgeType: string }
): Promise<ForgetResult> {
  return db.write(async (txn) => {
    const rows = (
      await txn.query(
        "MATCH (a)-[e]->(b) WHERE a.gid = $sourceGid AND b.gid = $targetGid AND type(e) = $edgeType RETURN id(a) AS sourceId, id(b) AS targetId, properties(e) AS properties",
        target
      )
    ).rows as { sourceId: bigint; targetId: bigint; properties: Record<string, unknown> }[];
    if (rows.length === 0) return { found: false, edgesAffected: 0 };
    const { sourceId, targetId, properties } = rows[0]!;
    await txn.deleteEdge(sourceId, targetId, target.edgeType);
    const originalType = properties._original_type ?? target.edgeType;
    await txn.createEdge(sourceId, targetId, "FORGOTTEN", {
      properties: { ...properties, _forgotten: true, _original_type: originalType } as never,
    });
    return { found: true, edgesAffected: 0 };
  });
}
