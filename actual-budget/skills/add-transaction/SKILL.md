---
name: add-transaction
description: Add a transaction to Actual Budget. Use when the user says they spent money, paid for something, received income, or wants to log a transaction.
user-invocable: true
allowed-tools:
  - Read
  - Bash(node *)
---

# /actual-budget:add-transaction — Add a Transaction

Adds a transaction to the user's Actual Budget instance.

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

Fetch accounts to resolve names to IDs:

```bash
bun run <client> [--env=$ENV] accounts 100 0
```

If a category was mentioned, fetch categories:

```bash
bun run <client> [--env=$ENV] categories 100 0
```

Match names case-insensitively. If still ambiguous, ask the user before proceeding.

---

## Add the transaction

```bash
bun run <client> [--env=$ENV] add-transaction <accountId> <date> <amount> "<payee>" [categoryId] [notes...]
```

- `amount` is in dollars (e.g. `-45.00` for a $45 expense, `500` for $500 income)
- The client converts to Actual Budget's internal integer format automatically

---

## Confirm to the user

After a successful response, summarize what was added:
> Added: **$45.00** at **Walmart** → Groceries · Checking · 2026-03-21
