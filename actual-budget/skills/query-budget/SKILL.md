---
name: query-budget
description: Query Actual Budget — list accounts, check balances, view recent transactions, and trigger bank sync. Use when the user asks about their budget, account balances, spending, or wants to sync bank transactions.
user-invocable: true
allowed-tools:
  - Read
  - Bash(node *)
---

<objective>
Queries the user's Actual Budget instance for accounts, balances, transactions, and budget data using the official `@actual-app/cli` CLI.
</objective>

<quick_start>
```
/actual-budget:query-budget                           # list accounts with balances
/actual-budget:query-budget transactions Checking     # recent transactions
/actual-budget:query-budget budget 2026-03            # budget vs actual for March
/actual-budget:query-budget summary                   # financial snapshot
/actual-budget:query-budget bank-sync                 # sync all accounts
```
</quick_start>

<context>
Parse `env=<name>` from `$ARGUMENTS` before any other processing. Strip it from remaining arguments. Default to `""` (empty string). Credential file: `~/.claude/channels/actual-budget/${ENV}.env`. Omit `env=` from suggested commands when ENV is empty.

Check that `~/.claude/channels/actual-budget/${ENV}.env` exists. If not, tell the user to run `/actual-budget:configure-actual` first.
</context>

<setup>
Read `<base_dir>/../../references/cli-setup.md` and follow the CLI setup instructions to obtain `$ACTUAL`.

To resolve an account, category, or payee name to its ID:
```bash
$ACTUAL server get-id --type accounts --name "<name>" --format json
$ACTUAL server get-id --type categories --name "<name>" --format json
```
</setup>

<workflow>
Parse the first word of `$ARGUMENTS` (after stripping `env=`) as the subcommand.

**No arguments or `accounts`** — list accounts with balances:

```bash
$ACTUAL accounts list --format json
```

For each account, fetch its balance:
```bash
$ACTUAL accounts balance <id> --format json
```

Display a clean table: Account Name | Type | Balance.

**`transactions [account-name-or-id] [limit]`** — recent transactions:

Resolve the account name to an ID, then:
```bash
$ACTUAL transactions list --account <id> --start <YYYY-01-01> --end <today> --format json
```

Default limit: 20. Display: Date | Payee | Category | Amount.

**`budget [month]`** — budget vs actual for a month:

Month format: `YYYY-MM` (default: current month).
```bash
$ACTUAL budgets month <month> --format json
```

Display a table: Category | Budgeted | Spent | Remaining.

**`summary`** — overall financial snapshot:

Run account balances and current month budget, then display:
- Total assets, total liabilities, net worth (sum of all account balances)
- Top 5 over-budget categories this month

```bash
$ACTUAL accounts list --format json         # get all account IDs
$ACTUAL accounts balance <id> --format json  # for each account
$ACTUAL budgets month --format json          # current month budget
```

**`bank-sync [account-name-or-id]`** — trigger bank sync:

```bash
# Sync all accounts:
$ACTUAL server bank-sync

# Sync a specific account (resolve name to ID first):
$ACTUAL server bank-sync --account <id>
```

Display: `Synced: <account name or "all accounts">` on success, or the error on failure.

If syncing all accounts and one fails, try syncing each account individually and report which succeeded and which failed.
</workflow>

<success_criteria>
- Accounts displayed as a clean table with balances
- Transactions show date, payee, category, and amount
- Budget view shows budgeted vs spent vs remaining per category
- Bank sync reports success per account or surfaces errors per account
</success_criteria>
