---
name: budget
description: Query Actual Budget — list accounts, check balances, and view recent transactions. Use when the user asks about their budget, account balances, or spending.
user-invocable: true
allowed-tools:
  - Read
  - Bash(curl *)
  - Bash(cat *)
  - Bash(source *)
---

# /actual-budget:budget — Query Budget Data

Queries the user's Actual Budget instance for accounts, balances, and transactions.

Arguments passed: `$ARGUMENTS`

---

## Environment selection

Parse `env=<name>` from `$ARGUMENTS` before any other processing. Strip it from the
remaining arguments. Default to `""` (empty string) if not provided.

The credential file for the selected environment is:
`~/.claude/channels/actual-budget/${ENV}.env`

When `ENV` is empty the path resolves to `~/.claude/channels/actual-budget/.env` (the default).
When suggesting commands, omit the `env=` argument if `ENV` is empty.

---

## Prerequisites

Load credentials from `~/.claude/channels/actual-budget/${ENV}.env`. If the file doesn't exist,
tell the user to run `/actual-budget:configure env=$ENV setup` first.

## Authentication

Every request requires a session token. Obtain one with:

```bash
source ~/.claude/channels/actual-budget/${ENV}.env
TOKEN=$(curl -s -X POST "$SERVER_URL/account/login" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"$PASSWORD\"}" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
```

Use `Authorization: Bearer $TOKEN` on all subsequent requests.

---

## Dispatch on `$ARGUMENTS` (after stripping `env=`)

### No arguments or `accounts` → list accounts with balances

```bash
curl -s "$SERVER_URL/v1/accounts" \
  -H "Authorization: Bearer $TOKEN"
```

Display a clean table: Account Name | Type | Balance (formatted as currency).

### `transactions [account-name-or-id] [limit]` → recent transactions

If an account name is given, first resolve it to an ID via the accounts list.
Default limit: 20.

```bash
curl -s "$SERVER_URL/v1/accounts/$ACCOUNT_ID/transactions?limit=$LIMIT" \
  -H "Authorization: Bearer $TOKEN"
```

Display: Date | Payee | Category | Amount (negative = expense, positive = income).

### `budget [month]` → budget vs actual for a month

Month format: `YYYY-MM` (default: current month).

```bash
curl -s "$SERVER_URL/v1/budget/months/$MONTH" \
  -H "Authorization: Bearer $TOKEN"
```

Display a table: Category | Budgeted | Spent | Remaining.

### `summary` → overall financial snapshot

Run accounts + current month budget in parallel and display a combined summary:
- Total assets, total liabilities, net worth
- Top 5 over-budget categories this month
