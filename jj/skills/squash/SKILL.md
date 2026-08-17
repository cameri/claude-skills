---
name: squash
description: Moves changes from one jj change into another (usually the working copy into its parent) — jj's equivalent of `git commit --amend` or an interactive-rebase fixup/squash. Use when the user wants to fold work-in-progress into an earlier change, combine multiple small changes into one, or runs `/jj:squash`.
user-invocable: true
allowed-tools:
  - Bash(jj status:*)
  - Bash(jj diff:*)
  - Bash(jj squash:*)
  - Bash(jj log:*)
---

<essential_principles>
git users reach for `git commit --amend` (fold into the last commit) or an interactive rebase with `fixup`/`squash` (fold into an arbitrary earlier commit). jj has one command for both: `jj squash` moves changes from a source change into a destination — by default from `@` into its parent, which is the `--amend` case; pass `--from`/`--into` (or `-r`) to target any other pair, which is the fixup case, without needing an interactive rebase session at all.

If both the source and destination already have non-empty descriptions, `jj squash` tries to open an interactive editor to combine them — this hangs or fails outright in a non-interactive/agent session. Always pass `-m "<message>"` (set the combined message explicitly) or `-u`/`--use-destination-message` (keep the destination's message, discard the source's) to avoid that. Decide which based on whether the source's description said anything worth keeping — if it was just "wip" or undescribed, `-u` is almost always right.
</essential_principles>

<objective>
Fold changes from one change into another without needing an interactive rebase, keeping history clean by combining what should never have been separate.
</objective>

<quick_start>
Fold current work-in-progress into its parent (amend-equivalent): `jj squash -u` (or `-m "<combined message>"` if the wip description actually said something worth merging in)

Fold a specific change into a specific target (fixup-equivalent): `jj squash --from <source-rev> --into <target-rev> -u`

Fold only some files, not the whole change: `jj squash <path...> -u`
</quick_start>

<workflow>
1. Confirm which direction the fold goes — `jj log` to see the source and destination changes and their current descriptions, since squash's default (`@` into parent) is easy to get backwards from what the user means.
2. Check both descriptions. If either is empty, the other's is used automatically with no prompt. If both are non-empty, decide `-u` vs `-m "<message>"` per the principle above and pass it explicitly — never run squash without one of these flags when both sides are described, or it will hang waiting for an editor.
3. Run the squash. If moving only part of the diff, pass file paths as trailing arguments instead of moving the whole change.
4. If the source change becomes empty afterward, jj abandons it automatically (unless `--keep-emptied` was passed) — this is expected, not an error; mention it if the user seems surprised the source disappeared from `jj log`.
5. Verify with `jj log --limit 5` and `jj diff -r <destination>` that the destination now contains the combined changes and reads as one coherent unit.
</workflow>

<success_criteria>
The destination change contains the folded-in diff and an accurate combined description. The source change is gone (if it became empty) or contains only what wasn't moved. No interactive editor was left hanging.
</success_criteria>
