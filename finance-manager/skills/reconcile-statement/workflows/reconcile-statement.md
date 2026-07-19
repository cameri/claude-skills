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

## Step 7b — Categorize and create rules

After matching, for any transaction that needs a category:

1. **Look up existing rules** using `@actual-app/api` `getRules()` — check if a rule already covers this payee → category mapping.

2. **Assign the category** on the transaction using `updateTransaction({ category: catId })`.

3. **Create a rule if none exists** — for every new payee → category assignment, immediately create a rule so future transactions are auto-categorized:

```javascript
// Only set transfer_id — do NOT set transfer_acct (it is derived, not stored)
await api.createRule({
  stage: null,
  conditionsOp: 'and',
  conditions: [{ field: 'payee', op: 'is', value: payeeId, type: 'id' }],
  actions: [{ field: 'category', op: 'set', value: categoryId, type: 'id' }],
});
```

4. **Check for rule before creating** — avoid duplicates:
```javascript
const rules = await api.getRules();
const alreadyExists = rules.some(r =>
  r.conditions.some(c => c.field === 'payee' && c.op === 'is' && c.value === payeeId) &&
  r.actions.some(a => a.field === 'category' && a.value === categoryId)
);
if (!alreadyExists) await api.createRule({ ... });
```

5. **For transfer linkages** — link transactions using only `transfer_id` (NOT `transfer_acct`):
```javascript
await api.updateTransaction(idA, { transfer_id: idB });
await api.updateTransaction(idB, { transfer_id: idA });
```

> **Note:** Rules work on the resolved `payee` UUID, not on raw `notes` strings. The `imported_payee` → `payee` mapping is handled by separate pre-stage rules already in ActualBudget. Only create `stage: null` category rules here.

### Direction-conditional rules for e-transfers

For Interac e-Transfer payees, the category depends on direction — always create two rules per payee:

```javascript
// Incoming (receiving money) → Reimbursements & Rebates
await api.createRule({
  stage: null, conditionsOp: 'and',
  conditions: [
    { field: 'payee', op: 'is', value: payeeId, type: 'id' },
    { field: 'amount', op: 'gt', value: 0, type: 'number' },
  ],
  actions: [{ field: 'category', op: 'set', value: REIMBURSEMENTS_CAT_ID, type: 'id' }],
});

// Outgoing (sending money) → Discretionary Spending
await api.createRule({
  stage: null, conditionsOp: 'and',
  conditions: [
    { field: 'payee', op: 'is', value: payeeId, type: 'id' },
    { field: 'amount', op: 'lt', value: 0, type: 'number' },
  ],
  actions: [{ field: 'category', op: 'set', value: DISCRETIONARY_CAT_ID, type: 'id' }],
});
```

Apply this pattern to any payee where direction determines category (e-transfers, cash, etc.).

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
