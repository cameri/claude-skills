# ablate-ai-layer

Measure whether a repository's AI instructions still earn their place. Runs the
same real probe task N times with the always-loaded layer intact and N times with
it stripped — in throwaway git worktrees, never touching the working tree — then
grades every rule against what actually changed.

Imported as an **audited third-party skill** from
[`coleam00/skills`](https://github.com/coleam00/skills)
(`.claude/skills/ablate-ai-layer/`), MIT license, picked out of the repo's 33
skills on 2026-08-30 (the rest duplicate existing workspace skills/tools).

## Files

- `skills/ablate-ai-layer/SKILL.md` — the skill body, imported from upstream with
  three audited deltas applied (see below; upstream is 7654 bytes).
- `skills/ablate-ai-layer/scripts/map_layer.py` — read-only inventory of the AI
  layer with per-session token cost.
- `skills/ablate-ai-layer/scripts/run_ablation.py` — drives both arms; spawns
  `claude -p --output-format json` or a `--runner` shell command.
- `skills/ablate-ai-layer/references/comparison.md` — the blind grading rubric,
  imported with one one-word genericization (see below).

Import hash (sha256 of the imported `SKILL.md`, deltas included):
`8c37ae48d054b78398df6afe5c1821f24f11034d5c26a8d5678291f685769ad7`.

## Import audit (2026-08-30)

**Scripts** — both reviewed line-by-line before import:

- No network access of any kind; no credential reads; no exfiltration surface.
- `map_layer.py` is read-only (globs, frontmatter parsing, token estimate).
- `run_ablation.py` mutates only: throwaway worktrees (created from HEAD in a temp
  dir, removed in a `finally`), `.ablation/<timestamp>/` output inside the target
  repo (auto-gitignored), and a one-line `.gitignore` append if `.ablation/` is
  missing. Stripped-arm deletions happen only inside the throwaway worktree.
- Subprocesses: `git` with fixed internal args, and the agent runner (user-chosen
  `--runner` or `claude -p`). The probe task file is user-authored and passed via
  stdin.

**SKILL.md** — independent audit by the `skill-auditor` subagent (2026-08-30):
verdict **PASS (conditional)**, no blocking issues, no security or prompt-injection
risk. Strengths: exemplary description, strong approval gates, error-handling
verified against the scripts, sound reference split. Non-blocking findings and how
they were handled:

- *False "never touches the working tree" claim* (the script writes `.ablation/`
  and appends `.gitignore`) — **fixed in the import** (qualified in the
  description and both body spots).
- *`python` invocations* — this container has no `python` binary (only `python3`);
  upstream prose would fail here — **fixed in the import** (all three
  invocations).
- *Environment trace in rubric* ("In validation, a stripped run…") — **fixed in
  the import** (→ "In one project, …").
- *Markdown body, no XML tags* (the workspace's own authored skills use pure-XML
  bodies) — **deferred deliberately**: keeping the import close to upstream keeps
  future upstream syncs diffable. Noted as a follow-up migration if Cameri wants
  it.
- *`--out`/`--timeout`/`--keep-worktrees` flags undocumented in prose* — accepted
  (Resources points to `--help`); `--out` is the escape hatch for keeping results
  out of the repo.

**Delta summary vs upstream:** SKILL.md — `python`→`python3` (3 spots),
working-tree claim qualified (description + Step 1 bullet + Step 3 report line);
comparison.md — one genericization. Everything else byte-identical.

## Workspace caveats

- `map_layer.py` runs anywhere with Python 3.
- `run_ablation.py` needs a `claude` binary on PATH or `--runner`. In this omp
  sandbox, fresh-process probes hang (documented 2026-08-30: a second omp process
  gets stuck spawning its own channel MCP servers), so the run step needs either a
  runner outside this container or a target repo hosted where `claude` is
  available.
- The experiment writes `.ablation/` into the target repo; ensure the repo's
  `.gitignore` intent before running (the script appends if missing).
