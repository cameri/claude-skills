---
name: reconcile-statement
description: Reconciles a bank statement against ActualBudget. Use when a Financial document is received from paperless-ngx via webhook, when the user asks to reconcile a bank statement, or when a new statement arrives for any tracked account.
---

<objective>
Reconciles a single bank statement from paperless-ngx against ActualBudget: resolve the
document, extract its transactions, verify them against the ledger, insert what's missing,
and update the learned rules — so the ledger matches the statement to the cent and each
reconciliation gets faster as rules accumulate.
</objective>

<quick_start>
Incoming statement (paperless document ID or webhook payload) or a manual account +
statement period → follow `workflows/reconcile-statement.md`. It loads credentials from
`~/.claude/channels/`, resolves the document, reconciles against ActualBudget, and invokes
`workflows/self-evolve.md` at the end to update learned rules.
</quick_start>

<essential_principles>
Operate with an accountant's rigor and a financial planner's judgment — see
`../../VISION.md` for the full mindset this plugin is built around.

- Never delete or modify transactions marked as reconciled/cleared with prior approval
- For on-budget accounts: closing balance MUST match statement to the cent — no rounding
- For off-budget accounts: best-effort approximation is acceptable
- Always bank-sync before reconciling
- After every reconciliation, invoke `workflows/self-evolve.md` to update learned rules
</essential_principles>

<intake>
Ask the user to select one of:

1. **Process incoming statement** — provide the paperless document ID or webhook payload
2. **Reconcile a specific account manually** — provide the account name and statement period
3. **Review/update learned rules** — view or edit `docs/finance/learned-rules.md`
</intake>

<routing>
| Intent | Workflow |
|--------|----------|
| Incoming webhook / document ID | `workflows/reconcile-statement.md` |
| Manual reconciliation request | `workflows/reconcile-statement.md` |
| Review/update rules | Open `docs/finance/learned-rules.md` for editing |
</routing>

<reference_index>
- `references/cli-setup.md` — how to bootstrap the `$ACTUAL` binary and env vars
- `references/backfill-verification.md` — reconciling a multi-period gap: running-balance chain verification, avoiding OCR sign-transcription errors, table-parsing pitfalls, and handling accounts whose absolute balance won't reconcile against statement figures
</reference_index>

<personal_configuration>
This skill is portable — it ships with no account IDs, budget-specific rules, or
transaction data. Each user provides their own:

- `~/.claude/channels/finance-manager/config.json` — correspondent/title-pattern →
  ActualBudget account ID, ownership, and reconciliation mode per account. Written by
  `finance-manager:setup-finance-manager` (run that skill first if this file doesn't exist
  yet). Supersedes the older `docs/finance/account-map.md` (kept as a historical record, no
  longer read by this workflow).
- `docs/finance/learned-rules.md` (workspace-local, outside the plugin) — self-updating
  heuristics for payee matching and categorization (created empty; grows via
  `workflows/self-evolve.md`). Includes an `unlinked_transfer` registry — transactions left
  unlinked because no counterpart existed yet, retried automatically as more accounts get
  backfilled (see Step 7c in `workflows/reconcile-statement.md`).
- `docs/finance/financial-profile.md` (workspace-local) — life-phase and other profile
  facts (accumulation vs. decumulation) that inform planning-oriented skills

If `config.json` doesn't exist yet, run `finance-manager:setup-finance-manager` before
reconciling rather than asking ad hoc.
</personal_configuration>

<dependencies>
Credentials and tools required:

- `~/.claude/channels/actual-budget/.env` — ActualBudget server credentials
- `~/.claude/channels/paperless/.env` — Paperless-ngx credentials
- `actual-budget:query-budget` skill — list accounts/transactions
- `actual-budget:add-transaction` skill — add missing transactions
- `paperless:view-document` skill — get document metadata
- `paperless:view-content` skill — extract statement text
- `config.json`'s `reporting.telegram_chat_id` — reconciliation report destination; ask
  the user for one if unset
</dependencies>

<success_criteria>
- For on-budget accounts, the closing balance matches the statement to the cent after
  reconciliation
- No transaction modified or deleted without prior approval
- Missing transactions added only after chain verification (see
  `references/backfill-verification.md` for multi-period gaps)
- `workflows/self-evolve.md` invoked after every reconciliation; learned rules and the
  unlinked-transfers registry kept current
</success_criteria>
