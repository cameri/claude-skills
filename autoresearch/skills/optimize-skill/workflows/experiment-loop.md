# Workflow: Experiment Loop

<required_reading>
**Read these reference files NOW:**
1. references/mutation-strategies.md
</required_reading>

<process>
This is the autonomous optimization loop. Once started, **do not stop or ask for confirmation**. The user may be away. Run until manually interrupted or until every eval scores perfect (pass_rate = 1.0) across all test tasks.

**LOOP FOREVER:**

<step_1_inspect>
```bash
jj log -r 'ancestors(@, 3)'
jj status
```

Note the current change ID and SKILL.md content.
</step_1_inspect>

<step_2_mutate>
Based on which evals failed in the previous run (or baseline failures for the first mutation), edit the SKILL.md. See `references/mutation-strategies.md` for strategies. Fix only the constraints that map to failing evals.

**If jj:** commit this experiment as a new change:
```bash
jj describe -m "autoresearch/<tag>: experiment <N> — <what you changed>"
jj new
```

**If git:** create an isolated worktree for this experiment:
```bash
git worktree add /tmp/autoresearch-<tag>-exp<N> -b autoresearch/<tag>-exp<N>
```
Edit the SKILL.md inside that worktree. The main branch (`autoresearch/<tag>`) always holds the best-known SKILL.md. The worktree is throwaway — remove it on discard.
</step_2_mutate>

<step_3_evaluate>
For each of N runs (default: 5, use 10 for borderline results):
- Read the current SKILL.md
- Perform the test task as if you are an agent following those exact instructions
- Evaluate output against each binary eval question (yes=1, no=0)
- Record per-eval pass/fail

Example: 2 test tasks x 5 runs x 4 evals = 40 total binary checks.

Keep running totals only -- don't let intermediate steps flood context.
</step_3_evaluate>

<step_4_score>
```
pass_rate = total_passes / (N x tasks x evals)
```
</step_4_score>

<step_5_crash_check>
If a run produces completely off-target output:
- SKILL.md bug (malformed, missing sections): fix and re-run
- Idea fundamentally broke the skill: log as `crash`, discard, revert
</step_5_crash_check>

<step_6_log>
```
<change-id>	<pass_rate>	<passes>/<total>	<keep|discard|crash>	<description>
```

Example:
```
k7mno9p	0.80	32/40	keep	add explicit "never use git" constraint
l8nop0q	0.75	30/40	discard	restructure workflow order
m9opq1r	0.90	36/40	keep	add jj flag reference table
```
</step_6_log>

<step_7_decision>
**If pass_rate improved** (strictly better than previous kept score):

*jj:* keep the change — it's already committed, this is the new baseline.

*git:* merge the worktree branch into `autoresearch/<tag>`, then remove the worktree:
```bash
git -C /tmp/autoresearch-<tag>-exp<N> add skills/.../SKILL.md
git -C /tmp/autoresearch-<tag>-exp<N> commit -m "autoresearch/<tag>: experiment <N> — <what changed>"
git checkout autoresearch/<tag>
git merge --ff-only autoresearch/<tag>-exp<N>
git worktree remove /tmp/autoresearch-<tag>-exp<N>
git branch -d autoresearch/<tag>-exp<N>
```

**If pass_rate is equal or worse:**

*jj:* `jj undo`

*git:* discard the worktree without merging:
```bash
git worktree remove --force /tmp/autoresearch-<tag>-exp<N>
git branch -D autoresearch/<tag>-exp<N>
```

**Simplicity bonus**: If pass_rate is identical but the SKILL.md is shorter/cleaner, keep it.
</step_7_decision>

<step_8_next>
Target consistently failing evals in the next mutation. If stuck (3+ consecutive discards on the same failing evals), try a different mutation strategy from `references/mutation-strategies.md`.

If all evals pass (pass_rate = 1.0) for 2 consecutive experiments: stop. The skill is optimized.

**GOTO step_1_inspect.**
</step_8_next>
</process>

<failure_handling>
**Infinite loops**: If a SKILL.md change causes agent behavior to loop infinitely, abort and log as crash.

**Stuck progress**: If pass_rate hasn't improved after 5 consecutive experiments, try a radical mutation (restructure, rewrite from scratch). If still stuck after 3 more, the evals may be wrong.

**Context pressure**: Summarize results.tsv progress, note kept experiments, and continue.
</failure_handling>

<success_criteria>
A run is done when:
- [ ] All experiments logged in results.tsv
- [ ] Best-scoring SKILL.md committed in jj
- [ ] Pass rate trajectory documented (baseline → final)
- [ ] Loop stopped because: perfect score OR user interrupted

A well-optimized skill shows:
- Pass rate improvement of ≥10 percentage points over baseline
- No regressions on previously passing evals
- SKILL.md is not longer than the original (simplicity maintained)
</success_criteria>
