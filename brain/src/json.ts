// LatticeDB round-trips integer-valued properties as JS `bigint` (see
// learn-from.ts's stableStringify), which the native JSON.stringify throws
// on with no replacer. Use this everywhere a query result (recall's rows,
// or anything else that touched the DB) gets serialized for a tool response.
export function jsonStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v) => (typeof v === "bigint" ? v.toString() : v));
}
