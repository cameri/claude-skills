---
name: optimize-skill
description: Improve a SKILL.md using binary evals and iterative prompt mutation. Use when a skill has reliability issues or produces inconsistent results.
---

<essential_principles>
**The core idea:** An AI agent autonomously runs your skill, evaluates the output against binary yes/no criteria, mutates the SKILL.md to fix failures, and repeats — exactly as Karpathy's autoresearch does for ML training code. You wake up to a better skill.

**Binary evals only.** Never use scales (1–7). Binary yes/no questions compound probabilities predictably and produce actionable signal. "Did it use jj instead of git?" is a binary eval. "Was the response good?" is not.

**Run N times per evaluation.** Prompts are noisy. Run each test task 5–10 times and average — a single run score means nothing. The metric is pass rate: `total passes / (runs × evals)`.

**SKILL.md is the only file you edit.** Read the target SKILL.md, modify it, re-run, keep or revert. Nothing else changes.

**Version control: jj if available, git worktrees otherwise.** Check at setup. If `jj` is available, each experiment is a jj change — improved → keep, equal/worse → `jj undo`. If only `git` is available, use a worktree per run so loops are isolated: the main branch holds the best-scoring SKILL.md, each experiment runs in a throwaway worktree that is removed on discard.

**Simplicity criterion.** All else equal, shorter SKILL.md wins. A 0.01 improvement that adds 10 lines of hedging is not worth it. A 0.01 improvement from *deleting* a confusing paragraph? Keep it.

**NEVER STOP.** Once the loop begins, do not ask "should I continue?" The user may be away. Run until manually interrupted or until every eval scores perfect across all runs.

**Don't over-specify evals.** Avoid criteria so narrow that the model just parrots the rules back verbatim without actually executing them. Test real behavior, not recitation.
</essential_principles>

<intake>
What skill would you like to optimize, and do you have eval questions ready?

Provide:
1. **Path to SKILL.md** — e.g., `projects/claude-skills/jj/skills/working-with-jj/SKILL.md`
2. **Binary eval questions** (optional) — yes/no criteria for a good run. If omitted, I'll propose evals based on the skill's stated constraints.
3. **Test tasks** (optional) — standard tasks to run the skill against each iteration. If omitted, I'll generate 2–3 representative tasks.

**Wait for response before proceeding.**
</intake>

<routing>
| Response | Workflow |
|----------|----------|
| Path provided, first run | `workflows/setup.md` |
| "continue", "resume", already have results.tsv | `workflows/experiment-loop.md` |
| No path yet | Ask for SKILL.md path |

**After reading the workflow, follow it exactly.**
</routing>

<reference_index>
**Eval design:** references/eval-design.md — how to write effective binary yes/no evals
**Mutation strategies:** references/mutation-strategies.md — how to improve SKILL.md based on failing evals
</reference_index>

<workflows_index>
| Workflow | Purpose |
|----------|---------|
| setup.md | First-time setup: branch, baseline, initialize results.tsv |
| experiment-loop.md | The autonomous optimization loop |
</workflows_index>
