# Backfill verification

Techniques for reconciling a *gap* — several consecutive missed statement periods for one account — rather than a single incoming statement. The stakes are higher than a normal reconciliation: a mistake compounds silently across every period after it, and by the time it surfaces (if it ever does) the trail is cold.

## Verify the whole chain before inserting anything

Parse every statement in the gap first, entirely read-only, before writing a single transaction. For each statement, record its own printed opening balance, closing balance, and line items. Then, before touching ActualBudget:

1. **Confirm each statement's own arithmetic**: opening + sum(deposits) − sum(withdrawals) = closing, using the statement's *own* printed totals where available as a second check.
2. **Confirm the chain links**: statement `N`'s closing balance equals statement `N+1`'s opening balance, for every adjacent pair in the gap. A break here means either a transcription error or a genuine anomaly (e.g. an institution-side correction) — resolve which before proceeding, don't paper over it.

Only after every period in the gap validates cleanly should insertion begin. This ordering matters: it turns "did I get this right" into a yes/no check completed *before* any mutation, instead of a forensic exercise after the ledger is already wrong.

## Derive amount and sign from the balance delta, not column position

OCR'd statement tables are the most common source of transcription errors, and the dangerous ones are sign errors — a withdrawal transcribed as a deposit still "looks plausible" in isolation (right merchant, right rough amount) and can even coincidentally match a same-amount transaction found elsewhere, giving false confidence. The reliable derivation is: `signed_amount = balance[this line] − balance[previous line]`. Trust that over which visual column a number appears to occupy, especially in garbled multi-column layouts. If the running-balance chain check above passes cleanly for every line, sign errors are structurally ruled out — that's the real payoff of doing the chain check first.

## Table-parsing pitfalls in OCR'd statements

Two failure modes recur often enough to check for explicitly when writing a parser (regex or otherwise) for statement tables:

- **Header/data column misalignment.** A table's header row and its data rows don't always have the same number of blank/spacer columns — one row might insert an extra empty cell that another doesn't. Mapping a data value by "the column whose header says Withdrawals" can silently grab the wrong cell. More robust: for a given row, scan every cell between the description and the balance for the single non-empty amount, and use its sign (a leading `-`) to decide withdrawal vs. deposit, ignoring which named column it nominally fell under.
- **Multi-row repeating blocks disguised as a single block.** Some OCR layouts render a table as one label block ("Date / Description / Withdrawals / Deposits / Balance") followed by *all* the row values concatenated after it, rather than one row at a time. A parser that matches only the first occurrence of this pattern silently drops every transaction after the first. If a statement's line count doesn't match what "total deposits + total withdrawals" implies, suspect this before assuming the statement really only had one transaction that period.

Whatever the parsing approach, always cross-check the extracted lines against the statement's own printed "Total deposits" / "Total withdrawals" figures where present — this catches both of the above even when the running-balance chain happens to still close (rare, but possible if two errors cancel out).

## When the account's absolute balance won't reconcile against the statement figures

Occasionally an account's ledger balance in ActualBudget has drifted from what the real institution's statements show, for reasons that predate the current backfill (an inaccurate starting balance set at account-creation time, or an even older untracked gap). In that case, don't force the backfill's math to match the statement's absolute dollar figures — it structurally can't, and trying to will produce a false "mismatch" on data that's actually correct.

Instead, validate the *relative* effect: compute what the account's cumulative balance should become by adding the *net change* implied by the newly-inserted transactions (independently verified against each statement's own totals, per above) on top of whatever the ledger's cumulative balance already was immediately before the gap. If a later, independently-trustworthy checkpoint exists (e.g. live bank-sync data that resumes after the gap and is known-correct), you can also work backward from it: the ledger's cumulative balance immediately before the gap should equal (that checkpoint's current total) minus (everything already recorded after the gap) — solve for that fixed reference number once, then check every subsequent insert against it. Flag the underlying absolute-balance discrepancy for the user rather than trying to silently correct it as part of the backfill — it's a separate, older problem.

## Avoiding duplicates at a live-sync boundary

If the gap being backfilled butts up against data that's already live-synced (rather than a clean account-creation start), check whether the last real statement in the gap already includes a line dated *into* the first live-synced period — interest or a scheduled item is often posted/dated on the first of the following month even though it's "earned" during the prior period, and may already exist in the ledger from live sync. Compare the tail of your backfill against the head of the existing live data before inserting; drop any line that's already present rather than double-counting it.
