import type { Database } from "@hajewski/latticedb";
import type { SourceAdapter } from "./sources/types";
import { jsonStringify } from "./json";

export interface SyncResult {
  source: string;
  nodesCreated: number;
  nodesUpdated: number;
  nodesDeleted: number;
  edgesCreated: number;
  edgesDeleted: number; // edges are never "updated" in place — a property change is a delete+recreate, so both counters increment for that edge
  edgesSkipped: number; // edge referenced a sourceGid/targetGid with no corresponding node — not an error, just not actionable
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
  properties: Record<string, unknown>;
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
      "MATCH (a)-[e]->(b) WHERE e._brain_source = $source RETURN a.gid AS sourceGid, b.gid AS targetGid, type(e) AS rawType, e._original_type AS originalType, properties(e) AS properties",
      { source: adapter.name }
    )
  ).rows as unknown as { sourceGid: string; targetGid: string; rawType: string; originalType: string | null; properties: Record<string, unknown> }[];
  const existingEdgesByKey = new Map<string, ExistingEdge>(
    existingEdgeRows.map((r) => {
      const effectiveType = r.originalType ?? r.rawType;
      return [
        edgeKey(r.sourceGid, r.targetGid, effectiveType),
        { sourceGid: r.sourceGid, targetGid: r.targetGid, type: effectiveType, properties: r.properties },
      ];
    })
  );

  const incomingNodesByGid = new Map(snapshot.nodes.map((n) => [n.gid, n]));
  const incomingEdgesByKey = new Map(
    snapshot.edges.map((e) => [edgeKey(e.sourceGid, e.targetGid, e.type), e])
  );

  let nodesCreated = 0, nodesUpdated = 0, nodesDeleted = 0, edgesCreated = 0, edgesDeleted = 0, edgesSkipped = 0;
  // Nodes are keyed by gid alone — a hyperedge hub node (see
  // sources/graphify-out.ts) and a regular node share the same gid
  // namespace here. No collision has been observed in real data; if one
  // ever occurred, the two would silently overwrite each other in this map.
  const latticeIdByGid = new Map<string, bigint>();
  for (const [gid, existing] of existingNodes) latticeIdByGid.set(gid, existing.latticeId);

  await db.write(async (txn) => {
    // Deletes: edges gone from the snapshot, OR present in both but with
    // changed properties — edges are never updated in place (no stable id
    // of their own to key an update by), so a property change is always a
    // delete+recreate. See the create loop below for the other half.
    for (const [key, existing] of existingEdgesByKey) {
      if (existing.properties._forgotten) continue; // soft-forgotten — never diffed or touched
      const incoming = incomingEdgesByKey.get(key);
      if (!incoming || !propertiesEqual(existing.properties, incoming.properties)) {
        // Given the create-loop guard below, an edge of this source can
        // only ever have been created between two nodes of this same
        // source — so both ids should always be present here. The one way
        // that invariant can break is out-of-band: `recall`'s Cypher
        // passthrough is a fully raw escape hatch (by design) and could
        // delete a node directly without touching its edges, leaving a
        // stored edge that now dangles. Guard defensively rather than
        // trust the invariant unconditionally.
        const sourceId = latticeIdByGid.get(existing.sourceGid);
        const targetId = latticeIdByGid.get(existing.targetGid);
        if (sourceId === undefined || targetId === undefined) {
          edgesSkipped++;
          continue;
        }
        await txn.deleteEdge(sourceId, targetId, existing.type);
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
      } else if (existing.properties._forgotten) {
        continue; // soft-forgotten — never diffed or touched
      } else if (!propertiesEqual(existing.properties, node.properties)) {
        for (const [key, value] of Object.entries(node.properties)) {
          await txn.setProperty(existing.latticeId, key, value as never);
        }
        // Keys present on the existing node but absent from the incoming
        // snapshot (a property was removed at the source, not just changed).
        // The installed @hajewski/latticedb API (v0.14.0) has no node
        // property removal primitive — Transaction exposes
        // removeEdgeProperty() for edges but nothing equivalent for nodes
        // (confirmed against the FFI surface: lattice_edge_remove_property
        // exists, lattice_node_remove_property does not), and
        // setProperty(id, key, null) was verified to set the value to
        // `null` rather than delete the key — properties(n) still reports
        // the key afterwards, just with a null value. Nulling it out is the
        // closest available approximation of "removed": it replaces stale
        // data with an explicit null instead of leaving the old value
        // forever, but the key itself is NOT removed from the node — full
        // removal requires deleting and recreating the node.
        const incomingKeys = new Set(Object.keys(node.properties));
        for (const key of Object.keys(existing.properties)) {
          if (key !== "gid" && !incomingKeys.has(key)) {
            await txn.setProperty(existing.latticeId, key, null);
          }
        }
        if (node.ftsText) await txn.ftsIndex(existing.latticeId, node.ftsText);
        nodesUpdated++;
      }
    }
    // Creates: edges new in the snapshot, OR present in both but with
    // changed properties (recreated after being deleted above) — always
    // after all nodes above exist.
    for (const [key, edge] of incomingEdgesByKey) {
      const existing = existingEdgesByKey.get(key);
      if (existing?.properties._forgotten) continue; // soft-forgotten — don't recreate under the real type
      if (!existing || !propertiesEqual(existing.properties, edge.properties)) {
        // graphify-out's adapter (and the SourceAdapter contract generally)
        // allows an edge whose sourceGid/targetGid has no corresponding
        // node in the snapshot — a legitimate shape a real extraction can
        // produce. Passing a missing id straight to the native FFI layer
        // throws an opaque error inside this single db.write() transaction,
        // aborting and rolling back the ENTIRE sync over one bad edge. Skip
        // just that edge instead.
        const sourceId = latticeIdByGid.get(edge.sourceGid);
        const targetId = latticeIdByGid.get(edge.targetGid);
        if (sourceId === undefined || targetId === undefined) {
          edgesSkipped++;
          continue;
        }
        await txn.createEdge(sourceId, targetId, edge.type, { properties: edge.properties as never });
        edgesCreated++;
      }
    }
  });

  return { source: adapter.name, nodesCreated, nodesUpdated, nodesDeleted, edgesCreated, edgesDeleted, edgesSkipped };
}

function edgeKey(sourceGid: string, targetGid: string, type: string): string {
  return `${sourceGid} ${targetGid} ${type}`;
}

// A previously-removed property is approximated by nulling it out (see the
// setProperty(id, key, null) comment above) rather than truly deleting the
// key — properties(n) keeps reporting it, just as null, forever. Without
// this filter, a node with a nulled key would permanently compare
// "changed" against an incoming snapshot that simply omits the key (one
// side has N keys, the other N-1), even when nothing has actually changed
// since the removal. Treat "absent" and "present but null/undefined" as
// the same non-property on both sides before comparing.
function propertiesEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const isComparable = (k: string, v: unknown) => k !== "gid" && v !== null && v !== undefined;
  const aKeys = Object.keys(a).filter((k) => isComparable(k, a[k]));
  const bKeys = Object.keys(b).filter((k) => isComparable(k, b[k]));
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => valueEqual(a[k], b[k]));
}

// LatticeDB round-trips *integer*-valued properties as JS `bigint` (e.g. an
// edge's `weight: 1` comes back from `properties(e)` as `1n`) while a
// source snapshot's properties are always plain JS `number`/`string`/etc —
// floats round-trip as `number` unchanged (confirmed: `confidence_score:
// 0.9` comes back as `0.9`, a `number`, not `0.9n`). A naive
// stableStringify comparison is asymmetric here: JSON.stringify(1) is the
// unquoted number literal "1", but stringifying "1" (the decimal text a
// bigint replacer produces) is the quoted string literal "\"1\"" — so an
// unchanged `weight: 1` vs stored `1n` would always compare "different".
// Special-case the numeric pairing (either side bigint, other side
// bigint/number) via a `Number()` cast instead — safe here since these are
// small graph property values, nowhere near `Number.MAX_SAFE_INTEGER` —
// and fall back to stableStringify for everything else (strings, booleans,
// nested arrays/objects).
function valueEqual(a: unknown, b: unknown): boolean {
  if (typeof a === "bigint" || typeof b === "bigint") {
    if (isNumeric(a) && isNumeric(b)) return Number(a) === Number(b);
  }
  return stableStringify(a) === stableStringify(b);
}

function isNumeric(v: unknown): v is number | bigint {
  return typeof v === "number" || typeof v === "bigint";
}

// Same bigint-safe serialization brain/src/json.ts's jsonStringify uses for
// tool responses — reused here as a stable comparison key.
const stableStringify = jsonStringify;
