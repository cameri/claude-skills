---
name: checkout
description: Switches to working on an existing jj change or bookmark — jj's equivalent of `git checkout`/`git switch`, but structured very differently (no detached-HEAD state, and two genuinely different commands depending on intent). Use when the user asks to switch to, check out, resume, or go back to a branch/commit/change, or runs `/jj:checkout`.
user-invocable: true
allowed-tools:
  - Bash(jj log:*)
  - Bash(jj new:*)
  - Bash(jj edit:*)
  - Bash(jj status:*)
---

<essential_principles>
`git checkout <branch>` conflates two things jj keeps separate: making an existing commit the working copy, and starting new work from it. jj has no "detached HEAD" concept and no single command that means "make this my current context" — choose between two based on intent:

- `jj new <rev>` — creates a **new empty change on top of** `<rev>` and makes that the working copy. `<rev>`'s own content is untouched. This is the right default for "I want to resume/continue work based on this change" or "switch to this bookmark and start something new" — it's what jj's own docs recommend for resuming work on an existing change, precisely because it never rewrites what's already there.
- `jj edit <rev>` — makes `<rev>` **itself** the working copy; anything saved now directly rewrites that change in place. jj's own docs call this the less-recommended option ("generally recommended to instead use `jj new` and `jj squash`") and explicitly warn against `jj edit`-ing a change that has a conflict, since it can silently corrupt the plain-text conflict markers. Reach for `jj edit` only for short-lived, git-stash-like detours (pop onto an old change, tweak one thing, move on), not as the default way to "go back to" something.

For a bookmark specifically (`git checkout main`-equivalent): jj bookmarks don't auto-advance the way git branches do, so `jj new main` — not `jj edit main` — is almost always what's wanted; editing a bookmark's target commit directly would rewrite history other bookmarks or collaborators may depend on.
</essential_principles>

<objective>
Put the user's working copy on top of (or, rarely, directly onto) the change they asked to switch to, using whichever of `jj new`/`jj edit` actually matches what they're about to do next.
</objective>

<quick_start>
Resume/continue work based on an existing change or bookmark (the common case): `jj new <rev-or-bookmark>`

Directly rework an existing change in place (rare — only for short git-stash-like detours): `jj edit <rev>`
</quick_start>

<workflow>
1. Ask (or infer from context) what the user actually wants to do next: build new work on top of `<rev>` without touching it, or go back and change `<rev>`'s own content directly. Default to the former if unstated — it's non-destructive and matches jj's own recommendation.
2. Resolve `<rev>` — a change ID, a bookmark name, or a revset expression (`jj log` first if it's ambiguous which commit the user means).
3. Before using `jj edit`, check `jj log -r <rev>` for a `(conflict)` marker — refuse (or strongly warn) if present, and suggest `jj new <rev>` instead, per the conflict-corruption caveat above.
4. Run the chosen command. `jj new <rev>` creates a fresh empty change on top and reports it as the new `@`; `jj edit <rev>` reports `<rev>` itself becoming `@`, with no new change created.
5. Confirm with `jj log --limit 5` that `@` is now where the user expects, and mention which of the two modes was used and why, since the distinction isn't obvious coming from git.
</workflow>

<success_criteria>
`@` is the change the user meant to be working from. If `jj new` was used, `<rev>`'s own content and description are unchanged. If `jj edit` was used, it was a deliberate choice for a non-conflicted, short-lived detour — not a default reach.
</success_criteria>
