# finance-manager:reconcile-statement

Reconciles a bank statement against ActualBudget. Use when a Financial document is received from paperless-ngx via webhook, when the user asks to reconcile a bank statement, or when a new statement arrives for RBC or Tangerine accounts.

## Intake

Ask the user to select one of:

1. **Process incoming statement** — provide the paperless document ID or webhook payload
2. **Reconcile a specific account manually** — provide the account name and statement period
3. **Review/update learned rules** — view or edit `references/learned-rules.md`

## Core principles

- Never delete or modify transactions marked as reconciled/cleared with prior approval
- For on-budget accounts: closing balance MUST match statement to the cent — no rounding
- For off-budget accounts: best-effort approximation is acceptable
- Always bank-sync before reconciling
- After every reconciliation, invoke `workflows/self-evolve.md` to update learned rules

## Routing

| Intent | Workflow |
|--------|----------|
| Incoming webhook / document ID | `workflows/reconcile-statement.md` |
| Manual reconciliation request | `workflows/reconcile-statement.md` |
| Review/update rules | Open `references/learned-rules.md` for editing |

## References

- `references/account-map.md` — paperless correspondent + title pattern → ActualBudget account ID
- `references/learned-rules.md` — self-updating heuristics for payee matching and categorization
- `references/cli-setup.md` — how to bootstrap the `$ACTUAL` binary and env vars

## Dependencies

Credentials and tools required:

- `~/.claude/channels/actual-budget/.env` — ActualBudget server credentials
- `~/.claude/channels/paperless/.env` — Paperless-ngx credentials
- `actual-budget:query-budget` skill — list accounts/transactions
- `actual-budget:add-transaction` skill — add missing transactions
- `paperless:view-document` skill — get document metadata
- `paperless:view-content` skill — extract statement text
- Telegram chat ID `7175022` — reconciliation report destination
