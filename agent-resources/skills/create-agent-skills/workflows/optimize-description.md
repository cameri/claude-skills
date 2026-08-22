# Workflow: Optimize Skill Description

<objective>
The skill description is the primary trigger mechanism — Claude decides whether to invoke a skill based on this field alone. This workflow improves triggering accuracy by generating eval queries, reviewing them with the user, and iterating on the description.
</objective>

<process>

## Step 1: Generate trigger eval queries

Create 20 eval queries — a mix of should-trigger (8–10) and should-not-trigger (8–10). Save as JSON:

```json
[
  {"query": "user prompt here", "should_trigger": true},
  {"query": "another prompt", "should_trigger": false}
]
```

**Make queries realistic and specific.** Include file paths, job context, column names, company names — the kind of detail real users include. Some should be lowercase, casual, or contain typos. Mix lengths.

Bad queries: `"Format this data"`, `"Create a chart"`, `"Extract text from PDF"`

Good queries: `"ok so my boss just sent me this xlsx file (its in downloads, called Q4_sales_v2.xlsx) and she wants me to add a profit margin column — revenue is col C and costs are col D i think"`

**For should-trigger queries** — think about coverage:
- Different phrasings of the same intent (formal vs. casual)
- Cases where the user needs the skill but doesn't name it explicitly
- Uncommon but valid use cases
- Cases where this skill competes with another but should win

**For should-not-trigger queries** — make them tricky:
- Near-misses that share keywords but need something different
- Adjacent domains where a keyword match would be wrong
- Queries that touch on what the skill does but in the wrong context
- Avoid obviously irrelevant negatives ("write a fibonacci function" for a PDF skill tests nothing)

## Step 2: Review with user

Share the eval queries with the user before running anything:

> "Here are 20 trigger eval queries I'd like to use to test the description. The goal is to have the right ones trigger the skill and the tricky near-misses not trigger it. Can you take a look and let me know if any should be adjusted?"

Present them clearly grouped by should-trigger / should-not-trigger. Wait for sign-off before proceeding.

## Step 3: Evaluate current description

For each query, simulate whether the current description would trigger correctly:

- If the query clearly matches the description's stated purpose → triggered
- If the query is a near-miss that the description doesn't distinguish → evaluate carefully
- Count correct triggers and correct non-triggers

Share the score with the user: `"Current description scores X/20 on these queries."`

## Step 4: Improve the description

Identify which queries the current description gets wrong and why, then rewrite the description to handle them better.

Good description principles:
- States what the skill does AND when to use it
- Includes specific trigger phrases (not just generic keywords)
- Distinguishes this skill from adjacent ones
- Be a little "pushy" — skills tend to under-trigger, so lean toward broader coverage of the intended use cases
- Written in third person

Example — too vague:
```
description: Helps with data formatting and analysis tasks.
```

Better:
```
description: Transforms, cleans, and analyzes structured data files (CSV, Excel, JSON).
Use when the user wants to reshape data, add computed columns, filter rows, aggregate
values, or fix formatting issues in a data file — even if they don't use those exact words.
```

## Step 5: Validate and apply

Run the eval queries against the new description and confirm the score improved. Show the user a before/after comparison:

```
Before: 14/20 (70%)
After:  18/20 (90%)

Changed: Added "even if they don't use technical terms" and examples of common trigger
phrases like "add a column", "clean up this file", "fix the formatting".
```

Apply the updated description to the skill's SKILL.md frontmatter.

</process>

<success_criteria>
Description optimization is complete when:
- [ ] 20 trigger eval queries created and reviewed by user
- [ ] Current description scored against queries
- [ ] Description rewritten to address failures
- [ ] New description scores meaningfully better
- [ ] Updated description applied to SKILL.md frontmatter
- [ ] User confirms the new description makes sense
</success_criteria>
