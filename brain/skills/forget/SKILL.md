---
name: forget
description: Soft (default, recoverable) or permanent delete of a node or edge from the brain (the workspace's LatticeDB knowledge graph). Use to correct or retire a fact remember created, or as a general-purpose delete over any node/edge regardless of source.
user-invocable: true
---

<objective>
Soft (default, recoverable) or permanent delete of a node or edge from the
brain — corrects or retires a fact `remember` created, or acts as a
general-purpose delete over any node/edge regardless of source.
</objective>

<quick_start>
Call the `forget` tool with a `target`:
- A node: `{ "type": "node", "gid": "<gid>" }`
- An edge: `{ "type": "edge", "sourceGid": "<gid>", "targetGid": "<gid>", "edgeType": "<TYPE>" }`

`forget` takes a gid or an edge triple only — no search string. Find the
target with `recall` first if you don't already have its exact gid/triple.
</quick_start>

<permanent_delete_guardrail>
`permanent` defaults to `false` (soft). Soft forget relabels a node to
`Forgotten` (or retypes an edge to `FORGOTTEN`) — it stops appearing in
typical `recall` queries, but nothing is destroyed; there's no tool yet
to reverse it, but the data survives. `permanent: true` really deletes it
— gone for good, **except** if the target came from `learn_from`
(`_brain_source: "graphify-out"`) and its source still has it, the next
`learn_from` sync brings it back. Forgetting isn't the same as excluding
something from the source permanently — it just clears it from the brain
right now.

Never call `forget` with `permanent: true` without the user explicitly
confirming the exact target and understanding it can't be undone.
</permanent_delete_guardrail>

<success_criteria>
The tool call returns `{ found: true, edgesAffected }` without error. For a
soft forget, the target no longer appears in typical `recall` queries (it's
relabeled `Forgotten`/`FORGOTTEN`, not gone). `found: false` means the
gid/triple didn't match anything — re-run `recall` to get a current one.
</success_criteria>
