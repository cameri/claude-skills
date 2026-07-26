# Workflow: run-review

<required_reading>
1. `../references/net-worth-categorization.md`
2. `../references/rich-life-allocation.md`
3. `docs/finance/financial-profile.md`
4. `docs/finance/rich-life-goals.md`
5. `~/.claude/channels/finance-manager/config.json`
</required_reading>

<process>
## Step 1 — Lookback & Execution Audit

- Read the "Action Items" section of `docs/finance/rich-life-goals.md`. For each item,
  check whether it happened: query Actual Budget (`actual-budget:query-budget`) for the
  relevant account/category to confirm.
- For each goal in the "Active Goals" table, pull the current balance of its Funding
  Account from Actual Budget and compare to last session's recorded figure (see Session
  History) to see if the expected auto-deposit landed.
- Classify each carried action item: **Done**, **Missed**, or **Still in progress**. Note
  any unexpected cash-flow leakage (a fixed commitment that didn't hit, an account that
  drained faster than expected).
- If this is the first-ever run (Session History is empty), skip comparison — just note
  starting balances as the baseline.

## Step 2 — Net Worth & Liquidity Health Check

- Follow `../references/net-worth-categorization.md` to bucket every tracked
  account/wallet and compute the five bucket totals plus Net Worth.
- For the Bitcoin bucket: get wallet balances via `finance-manager:query-mempool`
  (descriptor lookup) and a current BTC/CAD spot price (WebSearch or similar). Record the
  price and timestamp used — this figure is an approximation, say so in the report.
  mempool.space public API rate-limits fairly aggressively — if the descriptor lookup
  fails after one retry, don't block the rest of the report on it: mark the Bitcoin
  bucket "unavailable this cycle (mempool.space rate-limited)" using last session's
  figure from Session History as a stale-but-labeled fallback if one exists, and move on.
- For Home Equity: read home value and mortgage principal from
  `docs/finance/financial-profile.md`. If either is still TBD, ask the user once; on
  answer, write it back into that file (Household section) via Edit so it isn't asked
  again.
- Compute Emergency Fund runway and confirm Line of Credit balance is $0 per the
  liquidity_check rules in the reference file. If nonzero, this is a headline flag in the
  report, not a footnote.
- **If the user asked for "quick net worth check" (SKILL.md routing option 3), stop
  here** — produce just this section as the reply, skip Steps 3-4.

## Step 3 — Optimization & Efficiency Scan

- Tax efficiency: check `docs/finance/financial-profile.md` for the household's current
  marginal tax bracket / RRSP contribution room if recorded. If not recorded, do not
  invent Canadian tax bracket figures from memory — either ask the user for their current
  marginal rate/contribution room, or note it as unknown and skip a numeric estimate
  rather than guessing at a bracket that may be stale.
- Recurring expense/subscription scan: follow the `variable_expense_scan` section of
  `../references/rich-life-allocation.md`. Query Actual Budget for repeated same-payee
  transactions over the last 2-3 months.
- Compute the Rich Life Allocation (Fixed Costs / Structural Savings / Fun Money) per
  `../references/rich-life-allocation.md`.

## Step 4 — Strategic Action Plan & Report

- Fill `../templates/report-template.md` with everything gathered in Steps 1-3.
- Pick at most 3 action items for next cycle, ranked by leverage (tax/structural fixes
  before anything touching discretionary spending).
- Send the report to the user via Telegram (see root `CLAUDE.md` → Telegram
  Communication) as the final reply — this is the deliverable, not a side effect.
- Update `docs/finance/rich-life-goals.md`:
  - Refresh each Active Goal's Current amount and Status
  - Replace the Action Items section with this cycle's up-to-3 items
  - Move any fully-funded goal to Closed Goals
  - Append one line to Session History: date, net worth, headline flags (e.g. "LOC
    nonzero", "goal X behind pace")
</process>

<success_criteria>
- Report produced matches the template's sections, fits in one short sitting, uses CAD
  throughout, no em dashes, no filler
- Every figure traces to Actual Budget, config.json, or a named docs/finance/ file
- `docs/finance/rich-life-goals.md` is updated before the workflow ends, not left stale
- No recommendation to cut a Rich Life discretionary category
</success_criteria>
