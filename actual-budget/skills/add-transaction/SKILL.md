---
name: add-transaction
description: Add a transaction to Actual Budget. Use when the user says they spent money, paid for something, received income, or wants to log a transaction.
user-invocable: true
allowed-tools:
  - Read
  - Bash(node *)
---

<objective>
Adds a transaction to the user's Actual Budget instance using the official `@actual-app/cli` CLI. Parses natural language descriptions to extract amount, payee, account, date, category, and notes.
</objective>

<quick_start>
Natural language examples:
- `spent $45 at Walmart on groceries`
- `paid $120 for electricity bill`
- `received $500 freelance income to checking`
- `coffee $4.50 today`
</quick_start>

<context>
Parse `env=<name>` from `$ARGUMENTS` before any other processing. Strip it from remaining arguments. Default to `""` (empty string). Credential file: `~/.claude/channels/actual-budget/${ENV}.env`. Omit `env=` from suggested commands when ENV is empty.

Check that `~/.claude/channels/actual-budget/${ENV}.env` exists. If not, tell the user to run `/actual-budget:configure-actual` first.
</context>

<setup>
Read `<base_dir>/../../references/cli-setup.md` and follow the CLI setup instructions to obtain `$ACTUAL`.
</setup>

<argument_parsing>
`$ARGUMENTS` (after stripping `env=`) is a natural language transaction description. Extract:

- **amount** — numeric value in dollars (expenses are negative, income is positive)
- **payee** — merchant or description
- **account** — account name if mentioned, otherwise use the first checking account
- **date** — if mentioned (e.g. "yesterday", "last Friday"); default to today (YYYY-MM-DD)
- **category** — if mentioned or confidently inferable (e.g. "groceries" → Groceries)
- **notes** — any remaining context
</argument_parsing>

<workflow>
**Resolve account and category IDs:**

```bash
$ACTUAL server get-id --type accounts --name "<account name>" --format json
```

If a category was mentioned:
```bash
$ACTUAL server get-id --type categories --name "<category name>" --format json
```

Match names case-insensitively. If ambiguous, ask the user before proceeding.

**Add the transaction:**

Amounts use **integer cents** (e.g. -$45.00 → `-4500`, $500 income → `50000`).

```bash
$ACTUAL transactions add \
  --account <accountId> \
  --data '[{"date":"<YYYY-MM-DD>","amount":<cents>,"payee_name":"<payee>","category":"<categoryId>","notes":"<notes>"}]'
```

Omit `category` and `notes` fields if not provided.
</workflow>

<success_criteria>
After a successful response, summarize what was added:
> Added: **$45.00** at **Walmart** → Groceries · Checking · 2026-03-21
</success_criteria>
