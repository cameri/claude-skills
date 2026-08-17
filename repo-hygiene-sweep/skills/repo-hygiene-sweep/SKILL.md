---
name: repo-hygiene-sweep
description: Checks every repo in a multi-repo workspace — the workspace repo itself plus every standalone repo listed in its root CLAUDE.md — for uncommitted or unpushed work. Use when asked "do we have any uncommitted files lying around?", "is everything pushed?", or before a break/handoff when loose ends across multiple repos need to be caught, since a plain git/jj status from the workspace root only sees the workspace repo and silently misses the rest.
allowed-tools:
  - Bash
---

<essential_principles>
A workspace root's own `jj status`/`git status` only ever sees that one repo. Standalone repos nested under `projects/` (or elsewhere) each have their own history and remote, and running `jj`/`git` from the workspace root — or worse, running bare `jj` *inside* a standalone repo that has no local `.jj` of its own — silently targets the wrong repo instead of erroring. That's exactly the trap this skill exists to route around: it checks each repo with the VCS it actually uses (`.jj` present → `jj -R <path>`, else `.git` present → `git -C <path>`), never assuming.

The standalone-repo list is **not** hardcoded in this skill — it's read from the workspace's own root `CLAUDE.md`, under the `### Standalone repos in `projects/`` heading, each entry a bullet like `` - `projects/foo/` ``. That keeps this skill portable: point it at a different workspace with a different repo list (or none) and it still does the right thing, including degrading gracefully if that heading or file doesn't exist at all.
</essential_principles>

<objective>
Answer "is there any uncommitted or unpushed work sitting around, anywhere in this workspace?" in one pass, covering every repo — not just the one the current shell happens to be sitting in.
</objective>

<quick_start>
```bash
bash scripts/sweep.sh
```
</quick_start>

<workflow>
1. Run the script from anywhere — it resolves the workspace root itself (`$CLAUDE_PROJECT_DIR`, or `/workspace` if that's unset; override explicitly with `REPO_HYGIENE_WORKSPACE_ROOT` if neither fits).
2. It checks, in order: the workspace repo itself, `docs/` (a common standalone-repo special case in this kind of layout — skipped cleanly if it isn't one), then every `projects/...` bullet under CLAUDE.md's "Standalone repos" heading.
3. Read the output: `OK` needs nothing, `DIRTY` lists what's uncommitted and/or unpushed (git repos also report ahead/behind against the tracked remote branch), `SKIP` means that path doesn't exist or isn't a repo root — not a failure, just not applicable.
4. Report anything `DIRTY` back to whoever asked, repo by repo — don't just say "some things are dirty," name them, since the whole point was to stop losing track of which repo has the loose end.
</workflow>

<success_criteria>
Script exits 0 only when every checked repo is clean and (for git repos) not ahead of its remote. Exit 1 means at least one repo needs attention — the printed `DIRTY` lines say which and why.
</success_criteria>
