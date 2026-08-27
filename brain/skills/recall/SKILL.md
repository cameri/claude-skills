---
name: recall
description: Query the brain (the workspace's LatticeDB knowledge graph) — ask a plain-language question about the workspace's code/docs/concepts, or run a raw Cypher query directly. Explicit-invocation only (does not compete with graphify's own auto-triggered query skill).
user-invocable: true
---

The `recall` MCP tool takes one literal Cypher query string — there is no
natural-language parameter. For a plain-language question:

1. Compose a Cypher query yourself against the brain's schema (nodes
   labeled `GraphifyNode` plus a file-type label — `Code`/`Document`/
   `Concept`/`Rationale`/`Hyperedge` — with properties `gid`, `label`,
   `norm_label`, `source_file`, `community_name`, etc.; edges typed by
   graphify's relation, e.g. `CALLS`, `IMPORTS_FROM`,
   `CONCEPTUALLY_RELATED_TO`; full-text search via the `@@` operator on
   any indexed property).
2. Call `recall` with that query.
3. If the question doesn't map cleanly to a MATCH pattern, use `@@` full-text
   search instead (e.g. `MATCH (n:GraphifyNode) WHERE n.norm_label @@ "..." RETURN n.gid, n.label`).

If the caller already knows the exact Cypher they want, call `recall`
directly with it — that's the escape hatch, not a separate mode.

`recall` is genuinely read-only, enforced at the database layer, not just by
convention: it opens the brain with LatticeDB's `readOnly` mode, which
rejects any `CREATE`/`DELETE`/`SET`/`MERGE`/`REMOVE` — even a raw Cypher
mutation — with an error, before it can touch the data. There is no way to
write to the brain through `recall`, by design or by accident. Writing
happens only through `learn_from` (bulk sync) — there is no dedicated
`remember`/`forget` skill yet.
