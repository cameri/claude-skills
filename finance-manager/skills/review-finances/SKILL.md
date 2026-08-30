---
name: review-finances
description: Runs a household financial review — lookback audit against last session's action items, net worth and liquidity health check, tax/expense optimization scan, and a single-sitting Markdown report with goal-tracking tables and up to 3 high-leverage next actions. Use when the user asks to "run financial update", "run the finances", uploads a new balance sheet/statement CSV for review, or asks for a net worth or goal-progress check-in.
---

<objective>
Runs a household financial review: a lookback audit against the previous session's action
items, a net worth and liquidity health check, an optimization scan (tax drag, idle cash,
recurring subscriptions, debt cost), and a single-sitting Markdown report with goal-tracking
tables and up to three high-leverage next actions. The review exists so the household's
money decisions stay grounded in real numbers and explicit goals rather than vibes — and so
each cycle's report gets shorter as the structural fixes land.
</objective>

<quick_start>
For a full review ("run financial update" / "run the finances"): read
`docs/finance/rich-life-goals.md` (action items + goals) and
`~/.claude/channels/finance-manager/config.json` (tracked accounts), pull balances and
category spend via `actual-budget:query-budget`, then fill `templates/report-template.md`.
Route other intents (goal edit, quick net worth check) via `<routing>` below.
</quick_start>

<essential_principles>
This skill operates with an accountant's rigor and a financial planner's judgment — see
`../../VISION.md` for the full mindset. Two more principles specific to this skill:

**Rich Life first.** The point of the numbers is to fund travel, dining out, family
support, and experiences without guilt — not to hit savings metrics for their own sake.
Never propose cutting discretionary "fun money" categories to hit a goal or savings
target. Optimize the boring, structural stuff instead: tax drag, idle cash, recurring
subscriptions, debt cost. Read `docs/finance/financial-profile.md` for the household's
actual philosophy/commitments before writing the report — don't assume.

**Life-phase aware.** Check `docs/finance/financial-profile.md` for the current phase
(accumulation vs. decumulation) before applying any advice. This skill's default
workflow assumes accumulation-phase priorities (savings rate, debt paydown, contribution
room); if the profile says otherwise, adapt rather than following the workflow blindly.

**No guessing when a real number exists.** Pull balances from Actual Budget
(`actual-budget:query-budget`) and account structure from
`~/.claude/channels/finance-manager/config.json`. Only fall back to a figure in
`docs/finance/financial-profile.md` or `docs/finance/rich-life-goals.md` for things
Actual Budget doesn't track (income, home equity, goal target dates). If a needed figure
is genuinely missing from both sources, ask once and offer to record the answer back into
`docs/finance/financial-profile.md` so it isn't asked again.
</essential_principles>

<intake>
Ask the user to select one of, unless intent is already unambiguous from how they asked
(e.g. "run financial update" clearly means option 1):

1. **Run the full review** — lookback audit → net worth/liquidity check → optimization
   scan → report
2. **Add, edit, or close a goal** — update `docs/finance/rich-life-goals.md` without
   running the full review
3. **Quick net worth check** — Step 2 only, no full report

**Wait for response before proceeding.**
</intake>

<routing>
| Response | Workflow |
|---|---|
| 1, "run", "full review", "financial update", CSV upload | `workflows/run-review.md` |
| 2, "goal", "add goal", "close goal" | `workflows/update-goals.md` |
| 3, "net worth", "quick check" | `workflows/run-review.md`, Step 2 only |

**After reading the workflow, follow it exactly.**
</routing>

<reference_index>
- `references/net-worth-categorization.md` — how to bucket tracked accounts/wallets into
  Liquid Cash, Tax Shelters, Home Equity, Bitcoin, and Debt (heuristic, no hardcoded
  account IDs)
- `references/rich-life-allocation.md` — how to compute the fixed-cost baseline vs.
  unencumbered fun money split
</reference_index>

<templates_index>
- `templates/report-template.md` — the report skeleton: Wins & Execution Audit, Goal
  Tracking Tables, Rich Life Allocation, Max 3 Action Items
</templates_index>

<personal_configuration>
This skill is portable — it ships with no salary figures, account IDs, or goal amounts.
Each user provides their own:

- `~/.claude/channels/finance-manager/config.json` — tracked accounts/wallets (written by
  `finance-manager:setup-finance-manager`)
- `docs/finance/financial-profile.md` (workspace-local) — life phase, household, fixed
  commitments, philosophy
- `docs/finance/rich-life-goals.md` (workspace-local) — self-updating goal tracker and
  action-item carryover

If `config.json` doesn't exist yet, run `finance-manager:setup-finance-manager` first.
</personal_configuration>

<dependencies>
- `actual-budget:query-budget` — account balances, category spend
- `actual-budget:add-transaction` — not used by this skill (read-mostly)
- `finance-manager:query-mempool` — Bitcoin wallet balance from descriptor/xpub
- Current BTC spot price in the household's base currency (see
  `docs/finance/financial-profile.md`) — look up (e.g. WebSearch) at report time; treat as
  an approximation, not a reconciled figure
- Telegram — send the finished report to the workspace's primary contact chat (see root
  `CLAUDE.md` → Telegram Communication)
</dependencies>

<success_criteria>
- Every number in the report either came from Actual Budget/config.json directly, or from
  a named `docs/finance/` file — never fabricated
- Report fits in one short sitting: clean headers, tables, bullets, no filler
- Max 3 action items, ranked by leverage
- `docs/finance/rich-life-goals.md` updated at the end of every full review (goal
  progress, action items carried/closed, one session-history line)
- No proposal to cut a discretionary "Rich Life" category to hit a number
</success_criteria>
