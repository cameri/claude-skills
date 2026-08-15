---
name: capture
description: Queue a candidate skill the moment you notice something reusable was just learned. Use mid-session when a procedure, workaround, or check would clearly help a future session — not for one-off facts (those go to memory instead).
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash(mkdir *)
  - mcp__plugin_cronjobs_cronjobs__list-jobs
  - mcp__plugin_cronjobs_cronjobs__add-job
---

# /replicator:capture — Queue a Skill Candidate

Arguments passed: `$ARGUMENTS`

Use this the moment you notice: "this took real work to figure out, and it
will come up again." Not for facts (save those to memory instead, per the
auto-memory system) — only for **procedures, checks, or workflows** a
future session could run instead of re-deriving.

## Steps

1. If `$ARGUMENTS` says to build it now (e.g. "now", "build it"), skip
   queueing — invoke the normal skill-authoring flow directly
   (`create-agent-skills` or `superpowers:writing-skills`) and stop.
   Nightly scrutiny is the default path, not a requirement Cameri can't
   override in the moment.
2. Otherwise, compose a queue entry:
   - **What was learned** — 2-4 sentences, specific enough that a
     different session could act on it without re-reading this transcript.
   - **Why it recurs** — the concrete evidence from *this* session (what
     was asked, what had to be re-derived, what gotcha showed up).
   - **Artifacts** — file paths touched, commands that worked, links.
   - **Suggested home** — an existing plugin to extend, or "new
     standalone skill," and a proposed name.
3. `mkdir -p /workspace/docs/replicator` if needed. Read
   `docs/replicator/queue.md` (if missing, start it with just a
   `# Skill Candidate Queue` heading). Append the entry as a new `##`
   section titled with today's date and a short slug, using the four
   fields above. Write the file back.
4. Check the nightly cycle is scheduled: call `list-jobs` and look for a
   task whose text mentions "replicator" and "meditate". If none exists,
   call `add-job` with `task: "Run the /replicator:meditate skill"` and
   `expression: "every day at 3am"`.
5. Confirm briefly what was queued. No need to build anything now — that
   happens tonight, with scrutiny.
