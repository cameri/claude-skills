---
name: budget
description: Query Actual Budget — list accounts, check balances, view recent transactions, and trigger bank sync. Use when the user asks about their budget, account balances, spending, or wants to sync bank transactions.
user-invocable: true
allowed-tools:
  - Read
  - Bash(node *)
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

Check that `~/.claude/channels/actual-budget/${ENV}.env` exists. If not, tell the user to
run `/actual-budget:configure` first.

---

## Client

All API calls are made via the Node.js client at `client.ts`, located two directories above
this skill's base directory (i.e. `<base_dir>/../../client.ts`).

Run it with:

```bash
node --experimental-strip-types <base_dir>/../../client.ts [--env=$ENV] <command> [args...]
```

If `node_modules` is missing from the client directory, install first:

```bash
npm install --prefix <base_dir>/../..
```

The client outputs JSON on stdout and errors as `{"error": "..."}` on stderr with exit code 1.

---

## Dispatch on `$ARGUMENTS` (after stripping `env=`)

### No arguments or `accounts` → list accounts with balances

```bash
bun run <client> [--env=$ENV] accounts
```

Display a clean table: Account Name | Type | Balance (formatted as currency).

### `transactions [account-name-or-id] [limit]` → recent transactions

If an account name is given, first resolve it to an ID:

```bash
bun run <client> [--env=$ENV] accounts 100 0
```

Then fetch transactions (default limit 20, start from beginning of current year):

```bash
bun run <client> [--env=$ENV] transactions <accountId> <YYYY-01-01> <today> <limit> 0
```

Display: Date | Payee | Category | Amount (negative = expense, positive = income).

### `budget [month]` → budget vs actual for a month

Month format: `YYYY-MM` (default: current month).

```bash
bun run <client> [--env=$ENV] budget-month [YYYY-MM]
```

Display a table: Category | Budgeted | Spent | Remaining.

### `summary` → overall financial snapshot

Run net-worth and current month budget in parallel and display a combined summary:

```bash
bun run <client> [--env=$ENV] net-worth
bun run <client> [--env=$ENV] budget-month
```

Display:
- Total assets, total liabilities, net worth
- Top 5 over-budget categories this month

### `bank-sync [account-name-or-id]` → trigger bank sync

```bash
node --experimental-strip-types <base_dir>/../../client.ts [--env=$ENV] bank-sync [account-name-or-id]
```

- If an account name or ID is given, syncs only that account.
- If omitted, syncs all accounts.

Display: `Synced: <account name or "all accounts">` on success, or the error message on failure.
