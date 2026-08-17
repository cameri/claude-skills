---
name: post-restart-check
description: Runs a quick health check after a container/session restart — verifies the SSH commit-signing key still has its matching public half, confirms Docker Buildx is present, and flags any pip package the Containerfile declares that a rebuild silently dropped. Use right after a container restart or rebuild, when commit signing suddenly fails with a missing-public-key error, when a Docker build fails complaining about buildx, or when a cron job that depends on a Python package starts failing after a rebuild.
allowed-tools:
  - Bash
---

<essential_principles>
Three specific failure modes have each independently broken this workspace after a container restart, each diagnosed from scratch in its own session before anyone noticed the pattern: a dropped `~/.ssh/id_ed25519.pub` breaking signed commits, a missing `docker-buildx-plugin` breaking the sandbox image build, and an ad-hoc `pip install` vanishing on rebuild and breaking a cron job. None of the three is fixed by "restart again" — each needs its own specific repair, and all three share the same root cause (state that lives only in a container's writable layer doesn't survive that container being rebuilt from its image).

This is a read-mostly check with one auto-fix: it regenerates a missing or mismatched SSH `.pub` file directly (a pure derivation from the private key — safe and reversible, since the private key itself is never touched). It does **not** auto-fix the Docker Buildx or pip-drift findings — those require a Containerfile edit and an image rebuild, which is a bigger, riskier action this skill deliberately leaves to a human decision.
</essential_principles>

<objective>
Catch the specific, already-recurring restart failure modes early — right after a restart, before something downstream (a commit, a build, a cron job) fails confusingly and has to be root-caused from scratch again.
</objective>

<quick_start>
```bash
bash scripts/post-restart-check.sh
```
</quick_start>

<workflow>
1. Run the script. It checks, in order: the SSH signing key's public half (auto-fixing a missing or mismatched one), `docker buildx version`, and — if a Containerfile is found — whether every package it `pip install`s is actually present right now.
2. The Containerfile path is auto-discovered (`$CLAUDE_PROJECT_DIR/containers/claude/Containerfile`, then `/workspace/containers/claude/Containerfile`) or can be set explicitly via `POST_RESTART_CHECK_CONTAINERFILE=/path/to/Containerfile`. If none is found, that check is skipped rather than failing — this workspace's own layout is not assumed to be universal.
3. Read the output: `OK` needs nothing, `FIXED` was auto-repaired (SSH pubkey only), `FAIL`/`MISMATCH` needs a human decision — for Buildx, install `docker-buildx-plugin` in the Containerfile and rebuild; for a pip drift, add the missing package to the Containerfile instead of re-installing it ad-hoc (the ad-hoc install is exactly what vanishes on the next rebuild).
4. Report the findings on whatever channel this was invoked from. A clean run (exit 0) needs no action; a non-clean run (exit 1) should be flagged plainly rather than silently retried.
</workflow>

<success_criteria>
Script prints a per-check result and exits 0 only when every check that actually ran came back `OK` or `FIXED`. A `SKIP` (no docker, no pip, no Containerfile found) doesn't count against the exit code — it means that check doesn't apply to this environment, not that it failed.
</success_criteria>
