import type { Database } from "@hajewski/latticedb";

export async function recall(
  db: Database,
  cypher: string,
  parameters?: Record<string, unknown>
): Promise<{ rows: Record<string, unknown>[] }> {
  const result = await db.query(cypher, parameters);
  return { rows: result.rows };
}
