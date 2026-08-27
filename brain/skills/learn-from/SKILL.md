---
name: learn-from
description: Sync graphify's graph.json into the brain (the workspace's LatticeDB knowledge graph) — creates new nodes/edges, updates changed ones, deletes ones no longer in graphify-out. Use when the user asks to sync, refresh, or update the brain from graphify, or after running /graphify and wanting the brain to reflect it.
user-invocable: true
---

Call the `learn_from` MCP tool (no parameters — v1 has exactly one source,
`graphify-out`, read from `graphify-out/graph.json` at the workspace root).

Report the returned counts (`nodesCreated`, `nodesUpdated`, `nodesDeleted`,
`edgesCreated`, `edgesDeleted`) to the user plainly — these are the real
sync delta, not a guess.

If the tool call fails because `graphify-out/graph.json` doesn't exist yet,
tell the user to run `/graphify` first — `learn_from` has nothing to read
otherwise.
