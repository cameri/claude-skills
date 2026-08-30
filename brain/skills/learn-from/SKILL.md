---
name: learn-from
description: Sync graphify's graph.json into the brain (the workspace's LatticeDB knowledge graph) — creates new nodes/edges, updates changed ones, deletes ones no longer in graphify-out. Use when the user asks to sync, refresh, or update the brain from graphify, or after running /graphify and wanting the brain to reflect it.
user-invocable: true
---

<objective>
Sync graphify's graph.json into the brain (the workspace's LatticeDB
knowledge graph) — creates new nodes/edges, updates changed ones, deletes
ones no longer in graphify-out.
</objective>

<quick_start>
Call the `learn_from` MCP tool. With no arguments it syncs the default
source — graphify's `graphify-out/graph.json` at the workspace root. Two
optional arguments:

- `path` — sync any graph-json snapshot in the same
  `{nodes, links, hyperedges?}` shape instead of the default file (e.g. a
  second project's `graphify-out/graph.json`, or any other producer of the
  same schema). The resolved path is registered for `study_status`
  staleness tracking.
- `duration_seconds` — wall-clock seconds the calling agent's `/graphify`
  run took, if timed. Recorded on that path's study-registry entry so
  `study_status` can report it; omit when untimed — brain never invents
  one.

If the call fails because the default `graphify-out/graph.json` doesn't
exist yet (and no `path` was given), tell the user to run `/graphify`
first — `learn_from` has nothing to read otherwise.

<success_criteria>
Report the returned counts (`nodesCreated`, `nodesUpdated`, `nodesDeleted`,
`edgesCreated`, `edgesDeleted`) to the user plainly — these are the real
sync delta, not a guess.
</success_criteria>
