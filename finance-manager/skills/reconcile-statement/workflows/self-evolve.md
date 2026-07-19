# Workflow: self-evolve

Updates `references/learned-rules.md` after each reconciliation. Run automatically at the end of every `reconcile-statement.md` execution.

## Step 1 — Review reconciliation outcome

Gather from the just-completed reconciliation:

- Which statement lines matched automatically (by exact date+amount)
- Which required fuzzy matching (date offset, amount rounding)
- Which required manual intervention (user confirmed the match)
- Which payee names were normalized to known payees
- Which categories were assigned automatically vs left uncategorized

## Step 2 — Identify learnable patterns

For each non-obvious match or assignment, check if a rule already exists in `references/learned-rules.md`:

- If a rule already covers it: increment its `times_applied` counter and update `last_seen`
- If no rule covers it: add a new rule entry

### Learnable pattern types

| Type | What to capture |
|------|----------------|
| Payee name mapping | Raw statement description → known payee name |
| Category assignment | Payee or description pattern → ActualBudget category ID |
| Date offset | Bank settlement lag for a specific account (e.g. Visa posts 1 day after purchase) |
| Amount quirk | Rounding or sign convention specific to an institution |

## Step 3 — Update learned-rules.md

Read `references/learned-rules.md`, apply changes, write back.

Rules that have been applied ≥3 times with no errors should be marked `confidence: high`.
Rules applied once should be `confidence: low`.

## Step 4 — Confirm

Log to the reconciliation report: `🧠 Self-evolve: <n> rules updated, <m> new rules added`.
