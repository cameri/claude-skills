<overview>
Binary yes/no evals are the core measurement tool. Well-designed evals produce reliable signal. Poorly designed evals produce noise that leads the optimizer in wrong directions.
</overview>

<binary_rule>
**Always binary. Never scales.**

A scale (1–7) compounds probability: getting a "5" on three questions multiplies uncertainty three times. Binary questions don't. A "yes" is a "yes".

Wrong: "Did Claude follow the jj workflow well? (1-7)"
Right: "Did Claude use `jj new` instead of `git checkout -b`?"
</binary_rule>

<structure>
**Each eval question should:**
- Be answerable by reading the output alone (no inference needed)
- Map to a specific rule or constraint in the SKILL.md
- Target a known or plausible failure mode
- Have an unambiguous correct answer

**Template:**
> Did the agent [specific observable behavior] instead of [known failure behavior]?
</structure>

<parrot_problem>
**Avoid the parrot problem.**

Don't make evals so narrow that the model just recites rules back without executing them.

Wrong: "Did Claude mention that `git commit` should be replaced with `/jj:commit`?"
Right: "Did Claude actually use `/jj:commit` or `jj describe` (not `git commit`) when creating a commit?"

The wrong eval passes if Claude says "I should use jj". The right eval only passes if Claude *does* use jj.
</parrot_problem>

<count>
**3–6 evals is the sweet spot.**

Too few (1–2): Not enough signal, easy to overfit one dimension.
Too many (8+): Each run takes too long, and marginal evals dilute signal from important ones.

Start with the most important 3–5 evals that capture the core failure modes.
</count>

<jj_skill_example>
**Example evals for a JJ skill:**

1. Did the agent use `jj` commands (or `/jj:*` slash commands) exclusively, with no `git` write commands?
2. Were all jj flags and subcommands syntactically valid for Jujutsu (not git flags used on jj)?
3. Did the agent follow the stack-based workflow (describe → `jj new` → next change) when creating commits?
4. When viewing history or status, did the agent use `jj log`/`jj status`/`jj diff` instead of `git log`/`git status`?
5. Did the agent avoid mixing plan-driven and stack-based workflows in the same session?
</jj_skill_example>

<coverage>
**Cover different dimensions:**

For a version control skill, good eval dimensions:
- **Command correctness** — right tool, valid flags
- **Workflow adherence** — correct sequence of steps
- **Error avoidance** — doesn't fall back to disallowed patterns
- **Output quality** — result matches intent

Don't pile up 5 evals on the same dimension (e.g., 5 variations of "did it use jj?").
</coverage>

<updating_evals>
**When to update evals:**

Evals should stay fixed during an optimization run. Changing evals mid-run invalidates comparisons.

After a run completes, review evals:
- Did any eval never fail? It may be too easy — replace with a harder one.
- Did any eval always fail regardless of mutations? It may be unmeasurable — rephrase or remove.
- Did new failure modes emerge? Add evals to cover them in the next run.
</updating_evals>
