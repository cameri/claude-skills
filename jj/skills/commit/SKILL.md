---
name: commit
description: Describes the current jj working-copy change (jj's equivalent of `git commit`) and optionally stacks a new empty change on top. Use when the user asks to commit, save, or describe their current jj changes, or runs `/jj:commit`.
user-invocable: true
allowed-tools:
  - Bash(jj status:*)
  - Bash(jj diff:*)
  - Bash(jj describe:*)
  - Bash(jj commit:*)
  - Bash(jj log:*)
---

<essential_principles>
jj has no staging area and no separate "commit" step — every file in the working copy is already part of the current change (`@`) the moment it's saved to disk; `jj describe` just names that change. This replaces the git habit of `git add` + `git commit`: there is nothing to add.

Two similarly-named commands exist and are frequently confused:
- `jj describe -m "<msg>"` — sets the description on the CURRENT change (`@`) without moving on. Use when the user just wants to write/update the message for work already in progress.
- `jj commit -m "<msg>"` — describes `@` AND immediately creates a new empty change on top (equivalent to `jj describe -m "<msg>" && jj new`). Use when the user is done with this unit of work and ready to start the next one.
</essential_principles>

<objective>
Give the current jj working-copy change a description, matching how the user actually wants to keep working: staying on this change to keep adding to it, or moving on to start the next one.
</objective>

<quick_start>
Still working on this change, just want to save a message: `jj describe -m "<message>"`

Done with this change, ready for the next one: `jj commit -m "<message>"`
</quick_start>

<workflow>
1. Run `jj status` first — if there are no changes and no description, there's nothing to commit; say so instead of running a command.
2. Check `jj log -r @` to see whether `@` already has a description:
   - No description yet → this is new work; write one now.
   - Already described → the user is amending/replacing it, or wants to stack a new change — ask which if unclear (correcting a message vs. starting new work look identical from the diff alone).
3. Write a description in imperative mood, summarizing what changed and, if non-obvious, why — same bar as a good git commit message. Don't just restate the diff.
4. If the user wants to keep the message and move on to new work: `jj commit -m "<message>"`. If they want to keep editing this same change: `jj describe -m "<message>"`.
5. Confirm with `jj log --limit 3` so the user sees the resulting state (which change now has the description, and whether a new empty `@` was created on top).
</workflow>

<success_criteria>
The intended change has a clear, accurate description. If the user asked to move on, a new empty change is now `@`. Nothing was squashed, split, or rebased — this skill only ever describes and optionally stacks.
</success_criteria>
