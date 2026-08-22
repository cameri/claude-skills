# Workflow: Test and Iterate

<required_reading>
**Read these reference files NOW:**
1. references/iteration-and-testing.md
</required_reading>

<objective>
Run test cases against the skill using parallel subagents, evaluate results with the user, and iterate until the skill is good enough. This workflow turns a draft skill into a proven one.
</objective>

<process>

## Step 1: Set up eval cases

If `evals/evals.json` doesn't exist yet, create 2–3 realistic test prompts — the kind of thing a real user would actually say. Share them with the user for sign-off before running:

> "Here are a few test cases I'd like to try. Do these look right, or would you add anything?"

Save to `evals/evals.json`:

```json
{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 0,
      "prompt": "User's realistic task prompt",
      "expected_output": "Description of what a good result looks like",
      "files": []
    }
  ]
}
```

If evals already exist, review them and confirm they still make sense.

## Step 2: Spawn all runs in the same turn

For each test case, spawn two subagents **in the same turn** — one with the skill, one without (or against the previous version for improvement iterations). Launching them together lets them finish around the same time.

Put results in `<skill-name>-workspace/` as a sibling to the skill directory, organized as `iteration-N/eval-<id>-<descriptive-name>/`.

**With-skill run prompt:**
```
Execute this task:
- Skill path: <path-to-skill>
- Task: <eval prompt>
- Input files: <files if any, or "none">
- Save outputs to: <workspace>/iteration-<N>/eval-<id>-<name>/with_skill/outputs/
- Outputs to save: <what matters — e.g., "the generated file", "the final answer">
```

**Baseline run prompt** (same task, no skill path):
```
Execute this task without any skill:
- Task: <eval prompt>
- Input files: <files if any, or "none">
- Save outputs to: <workspace>/iteration-<N>/eval-<id>-<name>/without_skill/outputs/
```

For improvement iterations, use the previous version as baseline (snapshot it first: `cp -r <skill-path> <workspace>/skill-snapshot/`).

Write an `eval_metadata.json` for each eval directory:
```json
{
  "eval_id": 0,
  "eval_name": "descriptive-name-here",
  "prompt": "The user's task prompt",
  "assertions": []
}
```

## Step 3: Draft assertions while runs are in progress

Don't just wait — use the time to draft quantitative assertions. Good assertions:
- Are objectively verifiable (not "output looks good")
- Have clear descriptive names
- Cover the key things users care about

Add them to `eval_metadata.json` and to `evals/evals.json` under the `assertions` field. Explain to the user what you're checking and why.

Skip assertions for skills with subjective outputs (writing style, design) — focus on qualitative feedback from the user for those.

## Step 4: Grade, aggregate, and show results

Once runs complete:

1. **Grade each run** — for each assertion, evaluate whether the output passes. Save to `grading.json` in each run directory:
   ```json
   {
     "expectations": [
       {
         "text": "assertion description",
         "passed": true,
         "evidence": "what in the output supports this verdict"
       }
     ]
   }
   ```
   For assertions that can be checked programmatically, write and run a script rather than eyeballing — more reliable and reusable.

2. **Present results** — show the user a clear summary:
   - For each eval: prompt, with-skill output, baseline output, assertion pass/fail
   - Highlight where the skill helped vs. where it didn't
   - Note patterns across evals (e.g., all three missed X)

3. **Ask for feedback** — "How does this look? What would you change?"

## Step 5: Improve and repeat

Based on feedback:

1. **Generalize from specifics.** Don't make the skill overfitted to these exact test cases. If the feedback is "it missed the axis labels", ask yourself: what general instruction would prevent this class of problem?

2. **Explain the why.** Instead of `ALWAYS include axis labels`, explain why: "Include axis labels — users will be viewing these charts without context and need to understand what each axis represents." Smart models respond better to reasoning than mandates.

3. **Keep it lean.** Remove instructions that aren't earning their place. Read the transcripts — if the skill caused the model to waste time on something unproductive, remove the part that caused it.

4. **Bundle repeated work.** If all 3 test runs independently wrote the same helper script, that script belongs in `scripts/` — let the skill provide it once rather than having every invocation reinvent it.

5. Apply improvements, spawn new runs into `iteration-<N+1>/`, and repeat from Step 4.

Stop when:
- The user is happy
- Feedback is all empty (everything looks good)
- You're not making meaningful progress

</process>

<success_criteria>
Testing and iteration is complete when:
- [ ] evals/evals.json exists with 2+ realistic test cases
- [ ] At least one full iteration has been run (with-skill + baseline)
- [ ] User has reviewed outputs and given feedback
- [ ] Skill has been improved based on feedback
- [ ] Final iteration shows meaningful improvement over baseline
- [ ] User confirms they're satisfied
</success_criteria>
