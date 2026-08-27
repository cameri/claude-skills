# brain

Workspace-wide knowledge graph backed by LatticeDB. Exposes `learn_from` and `recall` tools for ingesting structured knowledge and querying it via Cypher, `remember` a single fact directly, and `forget` a node or edge (soft or permanent). `learn_from` defaults to reading graphify's `graphify-out/graph.json`, but takes any graph-json snapshot in the same `{nodes, links, hyperedges?}` shape via an optional `path` argument — graphify is the default producer, not a hard dependency.

## Design

There is a single, workspace-wide brain (not one per project), backed by an
embedded LatticeDB graph database at `brain/knowledge.lattice`. `learn_from`
reads a source's structured output — by default graphify's
`graphify-out/graph.json`, or any file in the same schema via an explicit
`path` argument — and incrementally syncs it in — creating, updating, and
deleting nodes and edges to match, scoped by a `_brain_source` tag so
different sources never clobber each other. All of this schema-parsing lives
behind the generic `SourceAdapter` interface (`src/sources/types.ts`); the
sync logic in `src/learn-from.ts` never sees graphify's shape directly, only
the adapter's normalized `{gid, labels, properties}` nodes and
`{sourceGid, targetGid, type, properties}` edges. `src/sources/graphify-out.ts`
is the one adapter implementing that interface today, for graphify's own
`{nodes, links, hyperedges}` format. `recall` runs a literal Cypher query
against the graph and returns the matching rows, acting as a raw query/write
escape hatch with no natural-language layer of its own.
`remember` writes a single fact directly (not via a bulk source sync),
optionally linked to existing nodes by gid or full-text search, tagged
`_brain_source: "remember"`. `forget` soft- (default) or permanently
deletes any node or edge regardless of source — soft forget relabels/
retypes rather than truly deleting, so `learn_from`'s next sync never
resurrects a tombstoned graphify-sourced node or edge.
