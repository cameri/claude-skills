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
      const hits = await txn.ftsSearch(link, { limit: 5 });
      for (const hit of hits) {
        const hitRows = (
          await txn.query("MATCH (n) WHERE id(n) = $id RETURN n.gid AS gid", { id: hit.nodeId })
        ).rows as { gid: string }[];
        const hitGid = hitRows[0]?.gid;
        if (typeof hitGid !== "string") continue; // stale FTS entry (deleted node) or a node with no gid
        resolvedLinks.push({ input: link, resolvedGid: hitGid, score: hit.score });
        break;
      }
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
      const targetId = targetRows[0]?.id;
      if (typeof targetId !== "bigint") continue; // resolved gid no longer resolves to a node — skip, don't crash
      await txn.createEdge(created.id, targetId, "ABOUT", { properties: { _brain_source: "remember" } });
    }

    return { gid, links: resolvedLinks };
  });
}
