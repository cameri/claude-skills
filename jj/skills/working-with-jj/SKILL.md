---
name: Working with Jujutsu Version Control
description: Use jj (Jujutsu) instead of git for all version control operations — commits, history, branching, pushing. Use for any git or jj repository. Prefer jj commands over git equivalents at all times.
allowed-tools: Bash(jj status:*), Bash(jj log:*), Bash(jj show:*), Bash(jj diff:*)
---

# Working with Jujutsu Version Control

## Core Concepts

**Jujutsu (jj)** - Git-compatible VCS with:

- **Change-based**: Unique IDs persist through rewrites
- **Auto-snapshotting**: Working copy snapshotted before each operation
- **Stack-based**: Build commits in a stack
- **Undoable**: All ops in `jj op log`, use `jj op restore` to time travel

**vs Git:** No staging area, edit any commit (`jj edit`), conflicts stored in commits

## Working Copy (`@`)

Current commit is always `@`:

- `jj log -r @` - Current commit
- `jj log -r @-` - Parent commit
- `jj log -r 'ancestors(@, 5)'` - Recent stack

**State:**

- Empty, no description → Ready for changes
- Has changes, no description → Needs description
- Has description + changes → Can stack with `jj new`
- Has description, no changes → Ready for new work

## Stack-Based Workflow

1. Make changes in `@` (new files tracked automatically via `/jj:commit`)
2. Describe: `jj describe -m "message"` or `/jj:commit`
3. Stack: `jj new`
4. Repeat

**Why stack:** Individual review, easy reordering, incremental shipping, clean history

## Plan-Driven Workflow

1. **Start**: Create "plan:" commit describing intent
2. **Work**: Implement the plan
3. **End**: Replace "plan:" with actual work using `/jj:commit`

**TodoWrite:** One commit per major todo, `jj new` between todos

## Automatic Snapshotting

Every `jj` command auto-snapshots the working copy into an unnamed commit. The operation log records every action ever taken:

```bash
jj op log              # Full operation history with timestamps
jj op show <op-id>     # What changed in a specific operation
jj undo                # Undo last operation
jj op restore <op-id>  # Time-travel to any point in history
```

Unlike `git reflog`, the operation log captures *everything*: rebases, merges, edits, conflict resolutions — not just branch pointer movements.

## First-Class Conflicts

jj stores conflicts *inside commits* rather than blocking operations. A conflicted state is just another commit you can describe, stack on, or resolve later.

```bash
jj rebase -s <source> -d <dest>  # May produce a conflicted commit — doesn't block
jj log -r 'conflicts()'          # List all commits with unresolved conflicts
jj resolve <file>                # Resolve a conflict interactively
jj diff -r <rev>                 # Inspect a conflicted commit's content
```

**In practice:** after a rebase that produces conflicts, work continues normally. You can create new commits on top of the conflicted one and resolve it whenever convenient — there is no forced stop like `git merge`.

## Parallel Changes

Create independent lines of work from the same base and rebase them together later:

```bash
jj new main -m "feature A"           # New change branching from main
jj new main -m "feature B"           # Another change from same base (parallel)
jj rebase -s <change-b> -d <change-a>  # Stack B on top of A
```

This is the jj equivalent of working in multiple branches simultaneously, without needing separate worktrees. Conflicts from the rebase are recorded in the commit, not blocking.

## When to Suggest Commands

**Viewing state:** `jj status`, `jj log`, `jj show`, `jj diff`

**Creating commits:**

- Use `/jj:commit` (not `jj describe` directly)
- Suggest when user has substantial changes or plan needs updating

**Organizing commits:**

- `/jj:split <pattern>` when mixing concerns (tests+code)
- `/jj:squash` for multiple WIP commits
- Don't suggest for simple, focused changes

**Undoing:** `jj undo`, `jj op restore`, `jj abandon`

## Slash Commands

- `/jj:commit [message]` - Stack commit with message generation
- `/jj:split <pattern>` - Split by pattern (test, docs, config)
- `/jj:squash [revision]` - Merge commits
- `/jj:cleanup` - Remove empty workspaces

## Git Submodules

**jj does not support git submodules.** When working inside a git submodule or managing submodule operations, use `git` directly:

- `git submodule add <url>` — add a submodule
- `git submodule update --init --recursive` — initialize/update submodules
- `git -C <submodule-path> <command>` — run git commands inside a submodule

Use jj only for the parent repository (non-submodule paths).

## Git Translation

Repository blocks git write commands via hook. Prefer jj equivalents:

- `git status` → `jj status`
- `git commit` → `/jj:commit`
- `git log` → `jj log`
- `git checkout` → `jj new`

## `jj restore` — Use With Care

`jj restore --from <rev> -- <path>` replaces the target path's content with the state from `<rev>`. **Any file present in `--to` but absent in `--from` will be deleted.** This has caused accidental mass-deletions when the source revision didn't include recently added files.

Before running `jj restore`:
1. Check what exists in the source: `jj diff -r <rev> -- <path>`
2. Check what would change: `jj diff --from <rev> -- <path>` (dry-run view)
3. After restoring, run `jj diff --summary` to verify no unexpected deletions

## Best Practices

**Do:** Stack commits, describe clearly (what/why), use plan-driven workflow, leverage `jj op log`, split mixed concerns

**Don't:** Mix git/jj (except for submodules), leave work undescribed, create monolithic commits, forget everything is undoable
