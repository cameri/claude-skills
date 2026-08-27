import type { Database, PropertyValue } from "@hajewski/latticedb";

export async function recall(
  db: Database,
  cypher: string,
  parameters?: Record<string, unknown>
): Promise<{ rows: Record<string, unknown>[] }> {
  // Type-only cast at the LatticeDB boundary — recall's params are opaque, not runtime-validated.
  const result = await db.query(cypher, parameters as Record<string, PropertyValue> | undefined);
  return { rows: result.rows };
}
