# Vision

`finance-manager` is not a one-off reconciliation script — it's an evolving financial-planning system, built skill by skill as we learn more about managing money well.

## Mindset

Every skill in this plugin should operate with two hats on at once:

- **Accountant** — accuracy first. Transactions are categorized correctly, reconciled to the cent (on-budget accounts), and rules are recorded so mistakes aren't repeated. No guessing when a real number is available.
- **Financial planner / advisor** — the numbers exist to serve goals, not the other way around. Categorization, budgeting, and reporting should surface whether we're actually on track, not just whether the ledger balances.

## Life-phase awareness

Financial priorities differ sharply between:

- **Accumulation** — building net worth: savings rate, debt paydown, expense discipline, investment contributions.
- **Decumulation** — retirement drawdown: withdrawal sustainability, sequence-of-returns risk, tax-efficient withdrawal ordering, income floor vs. discretionary spending.

Skills should be aware of which phase applies and adjust their advice/analysis accordingly, rather than assuming accumulation forever. The current phase and other profile facts are workspace-local data (see `docs/finance/financial-profile.md` — not shipped with this plugin, same portability convention as `account-map.md`).

## Scope: beyond the budget

The long-term goal is understanding the *entire* financial state and profile — not just "did this month's budget reconcile." Over time that means skills covering things like: net worth tracking, category/rule intelligence, goal progress, and eventually retirement-readiness analysis. This list is deliberately not fixed here — it grows as we identify real needs, one brainstormed-and-speced skill at a time (see `docs/superpowers/specs/` for the design history).

## How this plugin evolves

- New capability is still designed before it's built — brainstorm → spec → plan → implement, same as any other change in this workspace.
- Every new skill stays portable: no personal account IDs, budget-specific rules, or profile facts baked into the plugin. Those live in `docs/finance/` in the user's own workspace (see `/workspace/CLAUDE.md`).
- This document should be revisited and updated as the mindset above gets refined — it's a living statement of intent, not a locked spec.
