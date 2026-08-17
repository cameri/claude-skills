---
name: rebase
description: Moves jj changes onto a different parent — jj's equivalent of `git rebase`, but never stops for conflicts and offers three independent axes (what to move, where from, where to) instead of git's single linear replay. Use when the user asks to rebase, move commits onto a different base, or restack a branch, or runs `/jj:rebase`.
user-invocable: true
allowed-tools:
  - Bash(jj log:*)
  - Bash(jj rebase:*)
  - Bash(jj status:*)
  - Bash(jj resolve:*)
  - Bash(jj squash:*)
  - Bash(jj new:*)
---

<essential_principles>
`git rebase` replays commits one at a time and stops the whole operation at the first conflict, leaving the repo in a special mid-rebase state until you resolve and `git rebase --continue`. jj has no such state: `jj rebase` always completes in one step, and any conflicts it produces are stored *inside* the resulting commit(s) rather than blocking anything — `jj status`/`jj log` still work normally afterward, you can keep making unrelated changes, and you resolve the conflict whenever it's convenient rather than being forced to right away.

jj also separates *what* moves from *where it goes*, independently:
- **What** (pick exactly one): `-r <revs>` (just these changes, not descendants), `-s <rev>` (this change and everything descending from it), `-b <rev>` ("the branch" — everything not already an ancestor of the destination, relative to it). `-b` is the default if nothing is specified, and is usually what a git user means by "rebase my branch."
- **Where** (pick exactly one): `-d/--onto <dest>` (rebase directly onto dest), `-A <target>` (insert after target, rebasing target's descendants onto the rebased revisions), `-B <target>` (insert before target).

Get `-r`/`-s`/`-b` wrong and far more or far less history moves than intended — when unsure which the user means, show `jj log` first and confirm the exact set of changes before running anything.
</essential_principles>

<objective>
Move the intended set of changes onto the intended new parent, without needing to stop and resolve anything mid-operation — conflicts, if any, land inside the result for later resolution.
</objective>

<quick_start>
Rebase your current branch onto a new base (most common): `jj rebase -d <new-base>` (defaults to `-b @`, i.e. your whole current branch)

Rebase just one change and its descendants: `jj rebase -s <rev> -d <new-base>`

Rebase a single change without moving its descendants: `jj rebase -r <rev> -d <new-base>`
</quick_start>

<workflow>
1. Run `jj log` and confirm with the user exactly which changes should move (matters most for `-s` vs `-b` vs `-r` — see essential_principles) and exactly where they should land.
2. Run the rebase with the confirmed flags. Read the output: it reports how many commits were rebased and lists any that now show `(conflict)`.
3. If conflicts appeared, do NOT treat this as a failure or try to abort/retry — jj already completed the rebase. Resolve per-conflict using the [[checkout]] skill's `jj new <conflicted-rev>` pattern: create a change on top of the conflicted one, fix the content, then `jj squash --into <conflicted-rev> -u` to fold the fix back in (see the [[squash]] skill for the message-flag caveat). `jj resolve <path>` can also be used directly on the conflicted revision if it's already `@`.
4. Verify with `jj log -r 'conflicts()'` that no unresolved conflicts remain (or confirm with the user that any that do are intentionally deferred), and `jj log --limit 5` to confirm the final shape of history matches intent.
</workflow>

<success_criteria>
The intended changes now have the intended parent. Any conflicts produced are either resolved or explicitly left for later with the user's knowledge — never silently abandoned or left unmentioned. No `--continue`/`--abort`-style recovery was attempted, since jj doesn't have or need one.
</success_criteria>
