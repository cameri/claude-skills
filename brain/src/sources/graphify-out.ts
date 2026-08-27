import { readFile } from "node:fs/promises";
import type { SourceAdapter, SourceNode, SourceEdge, SourceSnapshot } from "./types";

interface GraphifyNode {
  id: string;
  label?: string;
  file_type?: string;
  norm_label?: string;
  source_file?: string;
  [key: string]: unknown;
}

interface GraphifyLink {
  source: string;
  target: string;
  relation?: string;
  [key: string]: unknown;
}

interface GraphifyHyperedge {
  id: string;
  label?: string;
  nodes: string[];
  [key: string]: unknown;
}

interface GraphifyOutJson {
  nodes: GraphifyNode[];
  links: GraphifyLink[];
  hyperedges?: GraphifyHyperedge[];
}

export async function readGraphifyOut(graphJsonPath: string): Promise<SourceSnapshot> {
  let raw: string;
  try {
    raw = await readFile(graphJsonPath, "utf-8");
  } catch (err) {
    throw new Error(`Could not read graph.json at ${graphJsonPath}: ${(err as Error).message}`);
  }
  const data: GraphifyOutJson = JSON.parse(raw);

  const nodes: SourceNode[] = [];
  const edges: SourceEdge[] = [];

  for (const n of data.nodes) {
    // file_type only becomes a label here, at node-creation time — it is
    // never carried as a property, so syncSource's diff (which only
    // compares properties, not labels) won't catch or update the label if
    // a node's file_type changes in a later graphify-out run. Known,
    // accepted v1 limitation.
    const { id, file_type, ...rest } = n;
    const labels = [file_type ? capitalize(file_type) : undefined, "GraphifyNode"].filter(
      Boolean
    ) as string[];
    nodes.push({
      gid: id,
      labels,
      properties: { ...rest, _brain_source: "graphify-out" },
      ftsText: [n.label, n.norm_label, n.source_file].filter(Boolean).join(" ") || undefined,
    });
  }

  for (const l of data.links) {
    const { source, target, relation, ...rest } = l;
    edges.push({
      sourceGid: source,
      targetGid: target,
      type: (relation ?? "related_to").toUpperCase(),
      properties: { ...rest, _brain_source: "graphify-out" },
    });
  }

  for (const he of data.hyperedges ?? []) {
    const { id, nodes: memberGids, ...rest } = he;
    nodes.push({
      gid: id,
      labels: ["Hyperedge"],
      properties: { ...rest, _brain_source: "graphify-out" },
    });
    for (const memberGid of memberGids) {
      edges.push({
        sourceGid: id,
        targetGid: memberGid,
        type: "HYPEREDGE_MEMBER",
        properties: { _brain_source: "graphify-out" },
      });
    }
  }

  return { nodes, edges };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const graphifyOutAdapter = (graphJsonPath: string): SourceAdapter => ({
  name: "graphify-out",
  read: () => readGraphifyOut(graphJsonPath),
});
