---
name: split
description: Splits the current (or a specified) jj change into two, either by file/path or interactively — jj's equivalent of `git add -p && git commit` for pulling part of a change out on its own. Use when a change mixes unrelated concerns (e.g. tests + implementation, or an unrelated fix that snuck into a feature change) and needs separating, or runs `/jj:split`.
user-invocable: true
allowed-tools:
  - Bash(jj status:*)
  - Bash(jj diff:*)
  - Bash(jj split:*)
  - Bash(jj log:*)
  - Bash(jj describe:*)
---

<essential_principles>
git has no direct equivalent — the closest habit is `git add -p` to stage part of a working tree then commit separately, or `git rebase -i` to split an existing commit. jj does this in one step: `jj split` takes the current change (or `-r <rev>` for any change) and divides it into a parent (the selected part) and child (the rest) commit, by default in that order.

Prefer non-interactive path-based splitting whenever the concerns divide cleanly along file boundaries — this is scriptable and doesn't depend on a diff-editor being configured or usable in a non-TTY session (agent sessions typically have neither). Only fall back to `-i`/interactive splitting when the unrelated content is mixed within the same file(s), and confirm with the user first since it opens an editor that can't be driven headlessly.
</essential_principles>

<objective>
Separate genuinely unrelated changes that ended up in one jj change into two, so each can be described and reviewed on its own.
</objective>

<quick_start>
Split specific files out into their own (first) commit: `jj split <path1> <path2> -m "<message for the split-out commit>"`

Split by content within a file (interactive, opens a diff editor): `jj split -i`
</quick_start>

<workflow>
1. Run `jj diff --summary` (or `jj diff -r <rev>` if splitting something other than `@`) to see exactly which files changed, and confirm with the user which files/content belong in the split-out commit versus what should remain.
2. If the split divides cleanly by file: `jj split <path...> -m "<description of the split-out part>"`. The named paths become the first (parent) commit; everything else remains in a new child commit that keeps `@`'s original description unless a new one is also given — check `jj log` afterward and describe the remainder if it's now undescribed.
3. If the split needs to happen within a single file's content: tell the user this requires the interactive diff editor (`jj split -i` or `-r <rev> -i`) and confirm they're driving this from an interactive terminal, not delegating it to run headlessly — it cannot be automated safely without a diff-editor tool configured.
4. Use `-p`/`--parallel` instead of the default parent/child split if the two resulting commits are truly independent (siblings) rather than one depending on the other.
5. Verify with `jj log --limit 5` that both resulting commits look right, and describe either one that came out without a description.
</workflow>

<success_criteria>
Two commits exist where there was one, each containing only the changes that belong together, both with accurate descriptions. Nothing outside the targeted revision was touched.
</success_criteria>
