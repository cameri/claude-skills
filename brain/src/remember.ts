import type { Database } from "@hajewski/latticedb";

export interface RememberLinkResult {
  input: string;
  resolvedGid: string;
  score?: number;
}

export interface RememberResult {
  gid: string;
  links: RememberLinkResult[];
}

export async function remember(
  db: Database,
  text: string,
  properties: Record<string, unknown> = {},
  links: string[] = []
): Promise<RememberResult> {
  const gid = crypto.randomUUID();

  return db.write(async (txn) => {
    // Resolve links against the graph as it stands BEFORE the new fact
    // exists — otherwise a search-string link could match the fact's own
    // freshly-indexed text.
    const resolvedLinks: RememberLinkResult[] = [];
    for (const link of links) {
      const directRows = (await txn.query("MATCH (n) WHERE n.gid = $gid RETURN n.gid AS gid", { gid: link })).rows;
      if (directRows.length > 0) {
        resolvedLinks.push({ input: link, resolvedGid: link });
        continue;
      }
      const hits = await txn.ftsSearch(link, { limit: 1 });
      if (hits.length === 0) continue; // best-effort — no match, skip this entry, don't fail the call
      const hitRows = (
        await txn.query("MATCH (n) WHERE id(n) = $id RETURN n.gid AS gid", { id: hits[0]!.nodeId })
      ).rows as { gid: string }[];
      resolvedLinks.push({ input: link, resolvedGid: hitRows[0]!.gid, score: hits[0]!.score });
    }

    const created = await txn.createNode({
      labels: ["Fact"],
      properties: { ...properties, gid, text, _brain_source: "remember" },
    });
    await txn.ftsIndex(created.id, text);

    for (const resolved of resolvedLinks) {
      const targetRows = (
        await txn.query("MATCH (n) WHERE n.gid = $gid RETURN id(n) AS id", { gid: resolved.resolvedGid })
      ).rows as { id: bigint }[];
      await txn.createEdge(created.id, targetRows[0]!.id, "ABOUT", { properties: { _brain_source: "remember" } });
    }

    return { gid, links: resolvedLinks };
  });
}
