---
name: add-transaction
description: Add a transaction to Actual Budget. Use when the user says they spent money, paid for something, received income, or wants to log a transaction.
user-invocable: true
allowed-tools:
  - Read
  - Bash(node *)
---

# /actual-budget:add-transaction — Add a Transaction

Adds a transaction to the user's Actual Budget instance using the official `@actual-app/cli` CLI.

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

---

## Parsing `$ARGUMENTS` (after stripping `env=`)

`$ARGUMENTS` is a natural language description such as:
- "spent $45 at Walmart on groceries"
- "paid $120 for electricity bill"
- "received $500 freelance income to checking"
- "coffee $4.50 today"

Extract:
- **amount** — numeric value in dollars (expenses are negative, income is positive)
- **payee** — merchant or description
- **account** — account name if mentioned, otherwise use the first checking account
- **date** — if mentioned (e.g. "yesterday", "last Friday"); default to today (YYYY-MM-DD)
- **category** — if mentioned or confidently inferable (e.g. "groceries" → Groceries)
- **notes** — any remaining context

---

## Resolve account and category IDs

Resolve the account name to an ID:

```bash
$ACTUAL server get-id --type accounts --name "<account name>" --format json
```

If a category was mentioned, resolve it too:

```bash
$ACTUAL server get-id --type categories --name "<category name>" --format json
```

Match names case-insensitively. If ambiguous, ask the user before proceeding.

---

## Add the transaction

Amounts use **integer cents** (e.g. -$45.00 → `-4500`, $500 income → `50000`).

```bash
$ACTUAL transactions add \
  --account <accountId> \
  --data '[{"date":"<YYYY-MM-DD>","amount":<cents>,"payee_name":"<payee>","category":"<categoryId>","notes":"<notes>"}]'
```

Omit `category` and `notes` fields if not provided.

---

## Confirm to the user

After a successful response, summarize what was added:
> Added: **$45.00** at **Walmart** → Groceries · Checking · 2026-03-21
