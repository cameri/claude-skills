---
name: cleanup
description: Removes stray empty jj changes and stale/orphaned jj workspaces that accumulate from interrupted work — checks for both before touching anything. Use when the user asks to clean up jj state, mentions clutter in `jj log`, or runs `/jj:cleanup`.
user-invocable: true
allowed-tools:
  - Bash(jj log:*)
  - Bash(jj workspace:*)
  - Bash(jj abandon:*)
  - Bash(jj status:*)
---

<essential_principles>
jj already auto-abandons the immediate previous working-copy change when you move away from it via `jj new` and it turns out to be empty and undescribed — that ordinary case doesn't need manual cleanup. What this skill targets is what slips through that: empty, undescribed changes left behind by an interrupted operation, a `jj undo`/`op restore` that resurrected one, or a change that only ever had transient content — and jj workspaces (from `jj workspace add`, e.g. a worktree created for parallel/isolated work) whose directory was deleted on disk without running `jj workspace forget` first, leaving a stale reference behind.

Never abandon `@` itself, even if empty — that's the normal, expected state to be in between changes, not clutter. Never abandon a change just because it's empty if it has a description — an intentionally-created placeholder (e.g. a "plan:" commit from the plan-driven workflow) is not clutter even though its diff is empty.
</essential_principles>

<objective>
Find and remove accumulated empty changes and orphaned workspace references without touching anything that's actually in use.
</objective>

<quick_start>
Find stray empty changes: `jj log -r 'empty() & mine() & ~@' --no-graph -T 'change_id.short() ++ " " ++ description ++ "\n"'`

Remove them: `jj abandon 'empty() & mine() & ~@'`

List workspaces (to spot stale ones): `jj workspace list`

Forget a stale one: `jj workspace forget <name>` (name is the workspace's directory basename, not necessarily what you'd guess — check `jj workspace list`'s output first)
</quick_start>

<workflow>
1. Empty changes: run the `empty() & mine() & ~@` query above and show the user what it found before abandoning anything — an empty change WITH a description is a candidate to ask about, not auto-remove (see essential_principles). Only abandon the undescribed ones without asking; confirm with the user for anything that has a description.
2. Stale workspaces: run `jj workspace list`, then for each non-default workspace check whether its directory still exists on disk. If the directory is gone, `jj workspace forget <name>` — this only removes the stale reference from the repo; there's nothing left on disk to touch.
3. If a workspace's directory still exists but `jj status` reports it as stale (rare — happens if something outside jj moved the working-copy state), that's `jj workspace update-stale`, not `forget` — don't remove a workspace that's still actually in use.
4. Report what was found and what was removed (or left alone and why) — this permanently drops changes/workspace tracking, so be explicit rather than silently doing it and moving on.
</workflow>

<success_criteria>
`jj log -r 'empty() & mine() & ~@'` returns nothing undescribed left over. `jj workspace list` contains only workspaces whose directories actually exist. `@` and every described change, empty or not, was left untouched.
</success_criteria>
