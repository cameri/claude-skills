# Workflow: Setup

<required_reading>
**Read these reference files NOW:**
1. references/eval-design.md
2. references/mutation-strategies.md
</required_reading>

<process>
<step_1_run_tag>
Propose a tag based on today's date and skill name, e.g. `jj-mar28a`. The jj change description will use `autoresearch/<tag>`.
</step_1_run_tag>

<step_2_vcs_detect>
Detect which VCS is available:

```bash
jj root 2>/dev/null && echo "jj" || echo "git"
```

**If jj:** create a change for this run:
```bash
jj new -m "autoresearch/<tag>: start optimization loop"
```

**If git only:** set up a dedicated branch on the current repo for the best-known SKILL.md, and plan to use worktrees per experiment in the loop:
```bash
git checkout -b autoresearch/<tag>
git push -u origin autoresearch/<tag>
```
Each experiment in the loop will run in an isolated `git worktree` — see `workflows/experiment-loop.md`.
</step_2_vcs_detect>

<step_3_read_skill>
Read the full SKILL.md. Understand:
- What the skill is supposed to do
- What constraints or rules it defines
- What failure modes are likely (flags, fallbacks, wrong tools)
</step_3_read_skill>

<step_4_define_evals>
If the user provided evals, use them. Otherwise, derive 3–6 yes/no questions from the skill's stated constraints and known failure modes. See `references/eval-design.md` for guidance.

Present the evals to the user for confirmation before proceeding:

```
Proposed evals for [skill name]:
1. Did the agent use [correct tool] instead of [wrong tool]?
2. Were the flags/parameters valid for [tool]?
3. Did the output follow the [specific workflow] pattern?

Proceed with these, or suggest changes?
```
</step_4_define_evals>

<step_5_test_tasks>
If the user provided test tasks, use them. Otherwise, define 2–3 representative tasks that exercise the skill's core behaviors and known failure modes.

Good test tasks are:
- Representative of real usage
- Specific enough to produce evaluable output
- Varied enough to cover different code paths
</step_5_test_tasks>

<step_6_init_results>
Create `results.tsv` in the skill's directory (do NOT commit this file — leave it untracked):

```
change	pass_rate	evals_passed	status	description
```
</step_6_init_results>

<step_7_baseline>
Run the skill **once** (or N=5 times if time allows) against each test task using the **current unmodified SKILL.md**.

To simulate a run: read the SKILL.md, then perform the test task as if you are an agent following those instructions. Evaluate the output against each binary eval. Record results.

Log the baseline to results.tsv:
```
<jj-change-id>	0.70	7/10	baseline	unmodified skill
```
</step_7_baseline>

<step_8_proceed>
Transition to `workflows/experiment-loop.md`. Once you start the loop, do not stop.
</step_8_proceed>
</process>

<success_criteria>
Setup is complete when:
- [ ] Run tag agreed and jj change created
- [ ] Target SKILL.md read and understood
- [ ] Binary evals defined and confirmed
- [ ] Test tasks defined
- [ ] results.tsv initialized with header
- [ ] Baseline score established and logged
- [ ] Ready to enter experiment loop
</success_criteria>
