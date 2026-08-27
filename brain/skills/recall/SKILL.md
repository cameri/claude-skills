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

**Caution: `recall` is not read-only.** The tool has no query-type
restriction — a query containing `CREATE`, `DELETE`, `SET`, `MERGE`, or
`REMOVE` will actually mutate the brain (this is a deliberate v1 design
choice, so the escape hatch stays fully raw). Be deliberate before running
anything that writes, and especially wary of anything that looks like
"forget" or "remove" this or that — there is no dedicated forget/delete
skill yet, and an ad-hoc `DELETE` query composed from a casual request could
destroy data with no undo.
