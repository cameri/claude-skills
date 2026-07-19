# Workflow: reconcile-statement

Reconciles a single bank statement from paperless-ngx against ActualBudget.

## Setup

Load credentials before any step:

```bash
set -a
source ~/.claude/channels/actual-budget/.env
source ~/.claude/channels/paperless/.env
set +a
ACTUAL="/workspace/projects/claude-skills/actual-budget/node_modules/.bin/actual"
TOKEN=$(http --ignore-stdin -b POST "${PAPERLESS_URL%/}/api/token/" \
  username="$PAPERLESS_USERNAME" password="$PAPERLESS_PASSWORD" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
```

---

## Step 1 — Resolve document

**From webhook payload:**
- Extract `title`, `correspondent`, `created` (statement date), `doc_url` or `document_id`
- Parse document ID from `doc_url` (last path segment before query string)

**From manual input:**
- User provides document ID directly, or account name + statement period

---

## Step 2 — Fetch document metadata

```bash
http --ignore-stdin -b GET "${PAPERLESS_URL%/}/api/documents/<id>/" \
  "Authorization:Token $TOKEN"
```

Key fields: `title`, `correspondent` name, `created`, `document_type`.

---

## Step 3 — Identify the ActualBudget account

Look up `references/account-map.md` using the correspondent name AND title pattern (last-4 digits where applicable).

If no match is found, ask the user to identify the account and update `references/account-map.md`.

---

## Step 4 — Extract statement content

```bash
http --ignore-stdin -b GET "${PAPERLESS_URL%/}/api/documents/<id>/preview/" \
  "Authorization:Token $TOKEN" > /tmp/statement-<id>.pdf
```

Or use the plain-text content endpoint if available:
```bash
http --ignore-stdin -b GET "${PAPERLESS_URL%/}/api/documents/<id>/content/" \
  "Authorization:Token $TOKEN"
```

Alternatively invoke `paperless:view-content` with the document ID.

Extract from the statement text:
- **Statement period**: start date and end date
- **Closing balance**: to-the-cent (e.g. `$1,234.56` → `123456` in cents)
- **Transaction list**: date, description, amount, running balance per line

Use `references/learned-rules.md` heuristics to help parse payee names.

---

## Step 5 — Bank sync

```bash
node "$ACTUAL" server bank-sync --account <accountId>
```

If bank-sync fails (no linked bank account), skip and note in the report.

---

## Step 6 — Fetch ActualBudget transactions

```bash
node "$ACTUAL" transactions list \
  --account <accountId> \
  --start <period-start-YYYY-MM-DD> \
  --end <period-end-YYYY-MM-DD> \
  --format json
```

---

## Step 7 — Reconcile

Match statement lines to ActualBudget transactions:

1. **Primary match**: same date + same amount (to the cent)
2. **Fuzzy match**: ±1 day date + same amount (for settlement lag)
3. **Unmatched statement lines** → candidate missing transactions
4. **Unmatched ActualBudget transactions** → candidate duplicates or corrections

### For on-budget accounts

- Add each missing transaction using `actual-budget:add-transaction`
- Never delete reconciled/cleared transactions
- After adding all missing transactions, verify closing balance:
  ```bash
  node "$ACTUAL" accounts list --format json | python3 -c "
  import sys, json
  accounts = json.load(sys.stdin)
  for a in accounts:
      if a['id'] == '<accountId>':
          print(a['balance'])
  "
  ```
  Balance in ActualBudget is stored in **cents**. Statement balance must match exactly.

### For off-budget accounts

- Best-effort matching only; balance discrepancies are acceptable
- Note any discrepancy in the reconciliation report

---

## Step 8 — Build reconciliation report

Format:

```
📊 Reconciliation Report — <Account Name>
Statement period: <start> → <end>
Statement closing balance: $<amount>

✅ Matched: <n> transactions
➕ Added: <n> missing transactions
⚠️  Unmatched in ActualBudget: <n> (possible duplicates)
🏦 Final balance: $<amount> (<MATCH ✓ / MISMATCH ✗>)

Deviations / notes:
- <any anomalies>
```

Send via Telegram:
```bash
# Use the Telegram reply tool with chat_id 7175022
```

---

## Step 9 — Self-evolve

After each successful reconciliation, invoke `workflows/self-evolve.md` to update learned rules.
