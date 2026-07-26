# Net Worth Categorization

How to bucket every tracked account/wallet in
`~/.claude/channels/finance-manager/config.json` into the five categories the report
needs. This is heuristic, not a fixed mapping — no specific account ID or name is
hardcoded here, so it works for any household's config.

<buckets>
| Bucket | What goes in it |
|---|---|
| Liquid Cash | Chequing, savings, joint emergency fund — anything spendable without penalty or delay |
| Tax Shelters | RRSP, Spousal RRSP, TFSA accounts |
| Home Equity | Home value minus mortgage/HELOC principal remaining — from `docs/finance/financial-profile.md`, not Actual Budget (mortgages usually aren't tracked as a live account) |
| Bitcoin | Every wallet in config.json's `wallets` array, converted to CAD at current spot price |
| Debt | Lines of credit, credit cards carrying a balance, any loan liability (e.g. a Bitcoin-backed loan's fiat side) |
</buckets>

<classification_heuristic>
For each entry in `config.json`'s `accounts` array, classify by name/institution keyword
match (case-insensitive):

1. Name contains "RRSP" or "TFSA" → Tax Shelters
2. Name contains "Line of Credit", "LOC", or the account carries a persistent negative
   balance funded by borrowing (not a credit card float) → Debt
3. `on_budget: false` and name suggests a loan (e.g. "Loan") → Debt
4. Everything else with `on_budget: true` or an obvious chequing/savings/joint-account
   name → Liquid Cash
5. Anything not confidently matched → ask the user once, then note the mapping in this
   review's report so it's consistent next time (don't silently guess indefinitely)

For `config.json`'s `wallets` array: every entry is Bitcoin, regardless of its `kind`
(hot/cold) — that split matters for security posture, not net worth. Convert BTC balance
to CAD using a current spot-price lookup (see SKILL.md dependencies) and note the price
and timestamp used in the report so the figure is auditable.

Home Equity is never derived from Actual Budget. Pull current home value and mortgage
principal remaining from `docs/finance/financial-profile.md`. If either is still marked
TBD there, ask the user once, then write the answer back to that file.
</classification_heuristic>

<liquidity_check>
- **Emergency fund runway** = Liquid Cash balance in the designated emergency fund
  account(s) ÷ total monthly Fixed Commitments (see
  `docs/finance/financial-profile.md`). Report in months.
- **Line of Credit balance must be $0.** A nonzero balance is a liquidity health flag —
  call it out explicitly in the report, don't bury it in a table.
</liquidity_check>
