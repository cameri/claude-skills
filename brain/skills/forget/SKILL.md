---
name: forget
description: Soft (default, recoverable) or permanent delete of a node or edge from the brain (the workspace's LatticeDB knowledge graph). Use to correct or retire a fact remember created, or as a general-purpose delete over any node/edge regardless of source.
user-invocable: true
---

Call the `forget` tool with a `target`:
- A node: `{ "type": "node", "gid": "<gid>" }`
- An edge: `{ "type": "edge", "sourceGid": "<gid>", "targetGid": "<gid>", "edgeType": "<TYPE>" }`

`permanent` defaults to `false` (soft). Soft forget relabels a node to
`Forgotten` (or retypes an edge to `FORGOTTEN`) — it stops appearing in
typical `recall` queries, but nothing is destroyed; there's no tool yet
to reverse it, but the data survives. `permanent: true` really deletes it
— gone for good, **except** if the target came from `learn_from`
(`_brain_source: "graphify-out"`) and its source still has it, the next
`learn_from` sync brings it back. Forgetting isn't the same as excluding
something from the source permanently — it just clears it from the brain
right now.

`forget` takes a gid or an edge triple only — no search string. Find the
target with `recall` first if you don't already have its exact gid/triple.
