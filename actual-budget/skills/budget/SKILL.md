---
name: budget
description: Query Actual Budget — list accounts, check balances, view recent transactions, and trigger bank sync. Use when the user asks about their budget, account balances, spending, or wants to sync bank transactions.
user-invocable: true
allowed-tools:
  - Read
  - Bash(node *)
---

# /actual-budget:budget — Query Budget Data

Queries the user's Actual Budget instance for accounts, balances, and transactions
using the official `@actual-app/cli` CLI.

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

Check that `~/.claude/channels/actual-budget/${ENV}.env` exists. If not, tell the user to
run `/actual-budget:configure` first.

---

## CLI setup

The `actual` CLI binary is installed at:

```
<base_dir>/../../node_modules/.bin/actual
```

If `node_modules` is missing, install first:

```bash
npm install --prefix <base_dir>/../..
```

Load credentials and export them for the CLI:

```bash
source ~/.claude/channels/actual-budget/${ENV}.env
# Support both old (no prefix) and new (ACTUAL_ prefix) credential names
export ACTUAL_SERVER_URL="${ACTUAL_SERVER_URL:-$SERVER_URL}"
export ACTUAL_PASSWORD="${ACTUAL_PASSWORD:-$PASSWORD}"
export ACTUAL_SYNC_ID="${ACTUAL_SYNC_ID:-$SYNC_ID}"
ACTUAL="<base_dir>/../../node_modules/.bin/actual"
```

All CLI calls below assume these variables are set.

---

## Name resolution

To resolve an account, category, or payee name to its ID, use:

```bash
$ACTUAL server get-id --type accounts --name "<name>" --format json
$ACTUAL server get-id --type categories --name "<name>" --format json
```

---

## Dispatch on `$ARGUMENTS` (after stripping `env=`)

### No arguments or `accounts` → list accounts with balances

```bash
$ACTUAL accounts list --format json
```

For each account, fetch its balance:

```bash
$ACTUAL accounts balance <id> --format json
```

Display a clean table: Account Name | Type | Balance.

### `transactions [account-name-or-id] [limit]` → recent transactions

Resolve the account name to an ID, then:

```bash
$ACTUAL transactions list --account <id> --start <YYYY-01-01> --end <today> --format json
```

Default limit: 20. Display: Date | Payee | Category | Amount.

### `budget [month]` → budget vs actual for a month

Month format: `YYYY-MM` (default: current month).

```bash
$ACTUAL budgets month <month> --format json
```

Display a table: Category | Budgeted | Spent | Remaining.

### `summary` → overall financial snapshot

Run account balances and current month budget in parallel, then display:
- Total assets, total liabilities, net worth (sum of all account balances)
- Top 5 over-budget categories this month

```bash
$ACTUAL accounts list --format json         # get all account IDs
$ACTUAL accounts balance <id> --format json  # for each account
$ACTUAL budgets month --format json          # current month budget
```

### `bank-sync [account-name-or-id]` → trigger bank sync

```bash
# Sync all accounts:
$ACTUAL server bank-sync

# Sync a specific account (resolve name to ID first):
$ACTUAL server bank-sync --account <id>
```

Display: `Synced: <account name or "all accounts">` on success, or the error on failure.

If syncing all accounts and one fails, try syncing each account individually and report
which ones succeeded and which failed.
