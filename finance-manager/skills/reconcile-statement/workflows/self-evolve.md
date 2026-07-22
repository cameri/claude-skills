# Workflow: self-evolve

Updates `docs/finance/learned-rules.md` (workspace-local, not part of this plugin — see `SKILL.md`) after each reconciliation. Run automatically at the end of every `reconcile-statement.md` execution.

## Step 1 — Review reconciliation outcome

Gather from the just-completed reconciliation:

- Which statement lines matched automatically (by exact date+amount)
- Which required fuzzy matching (date offset, amount rounding)
- Which required manual intervention (user confirmed the match)
- Which payee names were normalized to known payees
- Which categories were assigned automatically vs left uncategorized

## Step 2 — Identify learnable patterns

For each non-obvious match or assignment, check if a rule already exists in `docs/finance/learned-rules.md`:

- If a rule already covers it: increment its `times_applied` counter and update `last_seen`
- If no rule covers it: add a new rule entry

### Learnable pattern types

| Type | What to capture |
|------|----------------|
| Payee name mapping | Raw statement description → known payee name |
| Category assignment | Payee or description pattern → ActualBudget category ID |
| Date offset | Bank settlement lag for a specific account (e.g. Visa posts 1 day after purchase) |
| Amount quirk | Rounding or sign convention specific to an institution |
| Unlinked transfer | A transaction added without a transfer link because no counterpart was found *yet* — see below |

## Step 2b — Maintain the unlinked-transfers registry

This registry (`unlinked_transfer` entries in `docs/finance/learned-rules.md`) exists because transfer counterparts often live in accounts that simply haven't been backfilled yet — "not found" is frequently "not found *so far*," not "doesn't exist." Two things happen here every run:

- **Add**: for every transaction Step 7b left unlinked this run (no counterpart found in any tracked account), add an entry: account, transaction id, date, amount, and description/payee text. One line is enough — this is a worklist, not a report.
- **Remove**: for every entry Step 7c successfully linked this run, delete it from the registry. A shrinking registry is the signal this mechanism is working; a growing one that never shrinks means retries (Step 7c) aren't actually being run — check that they are, not that the registry format is wrong.

Suggested entry format:

```
## Unlinked transfers (revisit as more accounts get backfilled)

- **<Account>, <date>, <amount>** (`<txn id>`, "<description/payee text>"): no counterpart found as of <date first flagged>.
```

## Step 3 — Update learned-rules.md

Read `docs/finance/learned-rules.md`, apply changes, write back.

Rules that have been applied ≥3 times with no errors should be marked `confidence: high`.
Rules applied once should be `confidence: low`.

## Step 4 — Confirm

Log to the reconciliation report: `🧠 Self-evolve: <n> rules updated, <m> new rules added`.
