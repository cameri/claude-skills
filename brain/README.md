# brain

Workspace-wide knowledge graph backed by LatticeDB. Exposes `learn_from` and `recall` tools for ingesting structured knowledge (from graphify) and querying it via Cypher. Integrates with the graphify plugin to keep the knowledge graph synchronized with workspace context graphs.

## Design

There is a single, workspace-wide brain (not one per project), backed by an
embedded LatticeDB graph database at `brain/knowledge.lattice`. `learn_from`
reads a source's structured output (currently graphify's `graphify-out/graph.json`)
and incrementally syncs it in — creating, updating, and deleting nodes and
edges to match, scoped by a `_brain_source` tag so different sources never
clobber each other. `recall` runs a literal Cypher query against the graph
and returns the matching rows, acting as a raw query/write escape hatch with
no natural-language layer of its own.
