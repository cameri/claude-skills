---
name: remember
description: Write a single fact into the brain (the workspace's LatticeDB knowledge graph), optionally linked to existing nodes. Use when something durable and not derivable from a file should be remembered — a standalone observation, or a distillation from conversation — as opposed to learn_from's bulk sync from graphify.
user-invocable: true
---

<objective>
Write a single durable fact into the brain, optionally linked to existing
nodes, after checking it doesn't silently contradict something already
remembered.
</objective>

<workflow>
Before calling the `remember` tool, search first — this is the default
path, not an optional step:

1. Run `recall` with an `@@` full-text query for facts related to what
   you're about to remember.
2. Nothing related, or what you find is compatible/additive (a new fact
   that doesn't contradict anything) → call `remember` directly.
3. A genuine contradiction (e.g. remembering "use semicolons in X" when
   the brain already holds "don't use semicolons in X") → never call
   `remember` before resolving it. Ask the user if it's ambiguous, or
   reason it out from conversation context — then soft-`forget` whichever
   fact is superseded (`forget({ target: { type: "node", gid: <its gid> } })`,
   `permanent` left `false`) before calling `remember` with the new one.
</workflow>

<quick_start>
Call the `remember` tool with:
- `text` (required) — the fact itself.
- `properties` (optional) — structured key/values alongside the text (a
  category, a date, a confidence level — whatever's useful).
- `links` (optional) — an array where each entry is either a node gid you
  already know, or a plain search string; `remember` resolves a
  search-string entry itself via full-text search (top hit, best-effort —
  report the result's `links` array back to the user if a match looks
  questionable, since nothing else checks it). Omit or leave empty for a
  standalone fact.
</quick_start>

<success_criteria>
The tool reports the new fact's `gid` and, for each `links` entry, what it
actually resolved to (and its full-text score, if it was a search
string) — use this to judge whether a resolved link was actually right.
</success_criteria>
