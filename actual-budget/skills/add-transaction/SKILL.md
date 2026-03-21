---
name: add-transaction
description: Add a transaction to Actual Budget. Use when the user says they spent money, paid for something, received income, or wants to log a transaction.
user-invocable: true
allowed-tools:
  - Read
  - Bash(curl *)
  - Bash(cat *)
  - Bash(date *)
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

Load credentials from `~/.claude/channels/actual-budget/${ENV}.env`. If the file doesn't exist,
tell the user to run `/actual-budget:configure env=$ENV setup` first.

## Authentication

```bash
source ~/.claude/channels/actual-budget/${ENV}.env
TOKEN=$(curl -s -X POST "$SERVER_URL/account/login" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"$PASSWORD\"}" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
```

---

## Parsing `$ARGUMENTS` (after stripping `env=`)

`$ARGUMENTS` is a natural language description such as:
- "spent $45 at Walmart on groceries"
- "paid $120 for electricity bill"
- "received $500 freelance income to checking"
- "coffee $4.50 today"

Extract:
- **amount** — numeric value (expenses are negative, income is positive)
- **payee** — merchant or description
- **account** — account name if mentioned, otherwise ask or use the first checking account
- **date** — if mentioned (e.g. "yesterday", "last Friday"); default to today (`date +%Y-%m-%d`)
- **category** — if mentioned or confidently inferable (e.g. "groceries" → Groceries, "electricity" → Utilities)
- **notes** — any remaining context

If account or category is ambiguous, first fetch the accounts/categories list and pick the best match.
If still unclear, ask the user before proceeding.

---

## Resolve account ID

```bash
curl -s "$SERVER_URL/v1/accounts" -H "Authorization: Bearer $TOKEN"
```

Match the account name case-insensitively.

---

## Post the transaction

```bash
curl -s -X POST "$SERVER_URL/v1/accounts/$ACCOUNT_ID/transactions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction": {
      "date": "'"$DATE"'",
      "amount": '"$AMOUNT_IN_CENTS"',
      "payee_name": "'"$PAYEE"'",
      "category_id": "'"$CATEGORY_ID"'",
      "notes": "'"$NOTES"'"
    }
  }'
```

Note: Actual Budget stores amounts in **milliunits** (cents × 10). Convert accordingly:
- $45.00 expense → `-45000`
- $4.50 expense → `-4500`
- $500 income → `500000`

---

## Confirm to the user

After a successful POST (HTTP 200), summarize what was added:
> Added: **$45.00** at **Walmart** → Groceries · Checking · 2026-03-21
