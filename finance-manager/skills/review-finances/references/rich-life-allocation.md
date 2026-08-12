# The Rich Life Allocation

How to compute the baseline that anchors Step 3 of `templates/report-template.md`: what's
structurally spoken for versus what's genuinely free to spend without guilt.

<computation>
1. **Fixed Costs** — sum every row in `docs/finance/financial-profile.md`'s Fixed
   Commitments table (mortgage, remittances, charitable giving, utilities baseline, any
   other recurring non-discretionary line), plus any active debt service (e.g. Line of
   Credit interest, if the balance is nonzero this cycle).
2. **Structural Savings/Investment Allocations** — recurring auto-deposits into tax-
   advantaged accounts or goal-funding accounts (retirement contributions, named savings
   goals, etc. — the jurisdiction-specific account types live in
   `docs/finance/financial-profile.md`) — pull these as recurring transactions/schedules
   from Actual Budget, not from memory.
3. **Take-Home Pay** — household net income for the period under review, from Actual
   Budget's income transactions (not the gross salary figure in
   `docs/finance/financial-profile.md`, which is pre-tax).
4. **Rich Life / Fun Money** = Take-Home Pay − Fixed Costs − Structural Savings. This is
   the number to present as explicitly, unapologetically spendable — travel, dining out,
   family support beyond the fixed remittances, discretionary purchases.
</computation>

<presentation_rule>
Show Fixed Costs and Structural Savings as a short list, then Fun Money as one clear
number. Do not moralize about the Fun Money figure and do not suggest reducing it to
improve a goal's timeline — if a goal is behind target, the optimization scan (Step 3 of
the workflow) should look for drag in Fixed Costs or tax inefficiency first, and only
surface a Fun Money tradeoff if the user explicitly asks for one.
</presentation_rule>

<variable_expense_scan>
When scanning for subscription/recurring drag (Step 3 of the workflow):

- Pull recurring/repeated same-payee transactions from Actual Budget over the last 2-3
  months per account.
- Flag anything that looks like an unused or duplicate subscription, or a rate that's
  crept up — but only as a suggestion, never auto-categorize it as waste.
- Explicitly exclude categories the household has tagged as discretionary "Rich Life"
  spending (dining out, Uber Eats, travel) from this drag-hunt — those are working as
  intended, not a target for trimming.
</variable_expense_scan>
