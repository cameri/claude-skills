export interface SourceNode {
  gid: string;
  labels: string[];
  properties: Record<string, unknown>; // includes everything except id/labels — already has _brain_source stamped in
  ftsText?: string; // if present, caller should txn.ftsIndex(node.id, ftsText)
}

export interface SourceEdge {
  sourceGid: string;
  targetGid: string;
  type: string;
  properties: Record<string, unknown>;
}

export interface SourceSnapshot {
  nodes: SourceNode[];
  edges: SourceEdge[];
}

export interface SourceAdapter {
  name: string; // used as _brain_source
  read(): Promise<SourceSnapshot>;
}
