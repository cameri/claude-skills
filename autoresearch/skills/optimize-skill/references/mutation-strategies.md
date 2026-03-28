<overview>
Each experiment modifies the SKILL.md to improve pass rate. The strategy depends on which evals are failing and what pattern of failures you observe.
</overview>

<read_failures_first>
Before mutating, look at the eval failure pattern:
- Which evals fail most consistently?
- Do they fail early (agent never gets it right) or sometimes (noisy)?
- Does the failure correlate with a specific test task?

Map each failing eval back to a section of SKILL.md. Mutate that section.
</read_failures_first>

<strategies>
**Strategy 1: Add explicit prohibition**

When the agent falls back to wrong behavior despite the skill saying the right thing.

Before: `Use jj for version control.`
After: `Use jj exclusively. Never use git write commands (git commit, git add, git checkout, git branch). If you catch yourself about to run a git command, stop and find the jj equivalent.`

Best for: Fallback failures (agent knows the rule but violates it under pressure).

---

**Strategy 2: Add a translation table**

When the agent uses git flags or syntax on jj commands.

Add a section like:
```
| Instead of | Use |
|---|---|
| git commit -m | jj describe -m |
| git checkout -b | jj new |
| git log --oneline | jj log |
```

Best for: Syntax errors, flag confusion, wrong parameter names.

---

**Strategy 3: Add a concrete example**

When the agent understands the rule abstractly but gets the execution wrong.

Add a worked example showing the exact sequence of commands for a common task.

Best for: Workflow adherence failures where sequence matters.

---

**Strategy 4: Restructure section order**

When evals fail on a step that comes after a section the agent often stops reading.

Move the most critical constraints earlier in SKILL.md — agents weight earlier content more.

Best for: Inconsistent failures where the agent sometimes gets it right (context attention).

---

**Strategy 5: Remove ambiguous language**

When failures seem random and there's no clear pattern.

Look for ambiguous phrasing that could be interpreted multiple ways. Pick one meaning and state it unambiguously.

Before: `Prefer jj over git when possible.`
After: `Always use jj. There is no situation in this repository where git write commands are appropriate.`

Best for: Noisy failures with no clear pattern.

---

**Strategy 6: Delete over-explanation (simplicity)**

When pass rate is equal to or slightly better than baseline but the SKILL.md grew.

Try removing sections that restate obvious things, duplicate information, or explain concepts the agent already knows.

Best for: Maintaining score while reducing skill size. Often improves future scores too (less noise for the agent).

---

**Strategy 7: Radical restructure (last resort)**

When 5+ consecutive experiments show no improvement.

Rewrite a section from scratch with fresh framing. Sometimes the existing structure is the problem.

Best for: Stuck optimization runs. Use sparingly.
</strategies>

<what_not_to_change>
**Don't mutate these unless their eval is failing:**
- The skill's objective/purpose statement
- Sections covering behaviors that are already passing
- The overall skill structure (unless Strategy 7)
- Content unrelated to failing evals

Scalpel, not sledgehammer. Target the failing evals specifically.
</what_not_to_change>

<mutation_size>
**Small mutations score more reliably.**

Changing one thing per experiment means you know exactly what caused the improvement or regression. Changing three things at once makes attribution impossible.

One experiment = one logical change. Examples:
- Add one prohibition
- Add one translation row
- Reword one section
- Remove one paragraph
- Add one example

If you're tempted to make 3 changes at once, run them as 3 separate experiments.
</mutation_size>

<near_misses>
**Revisit near-misses.**

If an experiment scored 0.01 below baseline and was discarded, note what it tried. Later, if a different mutation bumps the score, you may be able to combine both changes for an additive improvement.

Keep a mental (or TSV comment) note of experiments that were close.
</near_misses>
