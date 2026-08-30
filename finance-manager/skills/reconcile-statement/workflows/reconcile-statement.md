Reconciles a single bank statement from paperless-ngx against ActualBudget.

**Setup**

Load credentials before any step:

```bash
set -a
source ~/.claude/channels/actual-budget/.env
source ~/.claude/channels/paperless/.env
set +a
ACTUAL="$(command -v actual 2>/dev/null || echo '<actual-budget-plugin-dir>/node_modules/.bin/actual')"
TOKEN=$(http --ignore-stdin -b POST "${PAPERLESS_URL%/}/api/token/" \
  username="$PAPERLESS_USERNAME" password="$PAPERLESS_PASSWORD" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
```

---

**Step 1 — Resolve document**

**From webhook payload:**
- Extract `title`, `correspondent`, `created` (statement date), `doc_url` or `document_id`
- Parse document ID from `doc_url` (last path segment before query string)

**From manual input:**
- User provides document ID directly, or account name + statement period

---

**Step 2 — Fetch document metadata**

```bash
http --ignore-stdin -b GET "${PAPERLESS_URL%/}/api/documents/<id>/" \
  "Authorization:Token $TOKEN"
```

Key fields: `title`, `correspondent` name, `created`, `document_type`.

**Detect untriaged documents**

A document was left untriaged by any workflow if any of:
- it still carries Paperless's inbox tag (resolve dynamically — `GET /api/tags/?page_size=200`, filter client-side for `is_inbox_tag: true` — never hardcode the tag ID)
- `correspondent` is `null`
- `document_type` is `null`

If any of these are true, automatically invoke `finance-manager:manage-paperless-workflows` (no need to ask first) to create or fix the workflow that should have tagged this document, using this document as the sample. Note the outcome inline in the reconciliation report:

- If it created/fixed a workflow: `🔧 no workflow had tagged this document — created/fixed workflow "<name>" automatically`
- If it aborted (no safe match found): `⚠️ no workflow had tagged this document, and no reliable match text was found — flagging for manual review`

Either way, reconciliation continues using whatever correspondent/document-type/account was resolved manually for this run — a fixed workflow only helps documents processed after it, per Paperless's `DOCUMENT_UPDATED` trigger semantics (see Task 7's live test for confirmation this actually applies going forward).

If it's unclear *why* a document is untriaged, or a document's extracted content looks wrong/scrambled and you're deciding whether to recommend reprocessing it, see `finance-manager:manage-paperless-workflows`'s `references/troubleshooting.md` for how to read the paperless-ngx container logs and a document's history API to diagnose it before guessing.

---

**Step 3 — Identify the ActualBudget account**

Look up `~/.claude/channels/finance-manager/config.json`'s `accounts` array using the
correspondent name (`institution` or `paperless_correspondent_id`) AND title pattern
(`paperless_title_pattern`, last-4/5 digits where applicable) — see `SKILL.md`.

If no match is found, ask the user to identify the account, then use
`finance-manager:setup-finance-manager`'s add-account workflow to record it rather than
editing `config.json` by hand.

---

**Step 4 — Extract statement content**

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

Use `docs/finance/learned-rules.md` heuristics to help parse payee names.

---

**Step 5 — Bank sync**

```bash
node "$ACTUAL" server bank-sync --account <accountId>
```

If bank-sync fails (no linked bank account), skip and note in the report.

---

**Step 6 — Fetch ActualBudget transactions**

```bash
node "$ACTUAL" transactions list \
  --account <accountId> \
  --start <period-start-YYYY-MM-DD> \
  --end <period-end-YYYY-MM-DD> \
  --format json
```

---

**Step 7 — Reconcile**

Match statement lines to ActualBudget transactions:

1. **Primary match**: same date + same amount (to the cent)
2. **Fuzzy match**: ±1 day date + same amount (for settlement lag)
3. **Unmatched statement lines** → candidate missing transactions
4. **Unmatched ActualBudget transactions** → candidate duplicates or corrections

**For on-budget accounts**

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

**For off-budget accounts**

- Best-effort matching only; balance discrepancies are acceptable
- Note any discrepancy in the reconciliation report

**Backfilling multiple consecutive periods**

When reconciling more than one statement in sequence for the same account — whether a clean gap spanning several months, or an account that's been live-synced the whole time but has still drifted from reality (sync silently dropping specific transactions in specific months) — verify the *chain*, not just each period in isolation — see `references/backfill-verification.md` for the full method (running-balance verification, catching transcription sign errors, avoiding duplicates at a live-sync boundary, OCR table-parsing pitfalls specific to multi-line/scrambled statement layouts, and diagnosing scattered non-contiguous drift). The short version: confirm each statement's own closing balance equals the next statement's opening balance *before* inserting anything; for a large discrepancy report, find a self-consistent checkpoint boundary first rather than assuming you need to backfill to account inception, then diff each period's own net change against ActualBudget's to pinpoint exactly which months need attention; and re-derive amount and sign from the balance delta between consecutive lines rather than trusting which column a number appears to sit in.

---

**Step 7b — Categorize and create rules**

**Rule out a fee reversal before treating a credit as a mystery**

A small, unexplained credit landing a few days after a same-amount fee/charge is very often the institution reversing that exact charge, not new income or an unlinked transfer. Before searching other accounts for a transfer match, check the account's own recent history for a matching-amount debit shortly before the credit in question. If found, treat it as a fee reversal/rebate: reuse (or create once, then reuse) a payee dedicated to this pattern, and categorize it as a reimbursement/rebate rather than income or a transfer.

**Transfers take priority over categories**

Before assigning any category, check whether the transaction is actually a transfer between two of the user's own accounts. Payees like "Online Banking Transfer", "Online Transfer", generic "Payment" / "Payment - Thank You", or "Payment Adjustment" are **never** fees or income by default — they are money movements between accounts. Search the *other* tracked accounts for a transaction with a matching (or near-matching, ±few days for settlement lag) amount and opposite sign around the same date:

- **Found**: link the pair as a transfer (see "For transfer linkages" below) — never assign a spending/income category to either side, and clear any category that may already be sitting on one side from a prior mis-categorization.
- **Not found in any tracked account**: before giving up, if the statement text shows a reference number for the transfer, try searching the document store directly for that reference number across *all* correspondents/institutions — the counterpart may sit in an account that itself has an unnoticed sync gap (its statements exist but were never reconciled), which a same-account-only search won't surface.
- **Still not found**: do not guess. Add the transaction (the statement is the source of truth) using a neutral, non-transfer payee, leave its category unset, flag it in the reconciliation report, and **record it in the unlinked-transfers registry** (see below) so it gets retried automatically as more accounts get backfilled — it may be an account not yet tracked in ActualBudget (see Step 3) or a paper/cash movement.

**Unlinked-transfers registry**

Every account reconciliation happens at a point in time, but coverage grows over time as more accounts get backfilled. A transfer counterpart that doesn't exist *yet* isn't necessarily unresolvable — it may simply live in an account that hasn't been reconciled/backfilled yet. Don't let "not found today" become a permanent dead end.

- Maintain a persistent list of every transaction left unlinked for this reason (see `docs/finance/learned-rules.md`'s `unlinked_transfer` entries — format defined in `workflows/self-evolve.md`). Each entry needs enough to re-match later: account, transaction id, date, amount, and description/payee text.
- Whenever an account is reconciled or backfilled (this one or any other), before finishing check the registry for entries whose date/amount could now match something in the account just touched (see Step 7c).
- When a match is found, link it as a normal transfer and remove the entry from the registry — the goal is to shrink this list over time, not just grow it.

**Certainty bar for categorization**

Only assign a category when certain: either an existing rule already covers the payee, or the *same* payee has a fully consistent category across all its prior transactions in the ledger (not just one instance). A single prior instance, or inconsistent history, is not certain enough — leave the category unset and note it in the report rather than guess.

When checking for precedent, search **across the whole budget, not just the account being reconciled**. A payee or pattern with no history on this account may already have an established rule or consistent categorization on a different account (a shared payee like a joint biller, or the same institution's fee showing up in more than one place). Missing that precedent produces the same real-world thing categorized two different ways depending on which account happened to record it first — check budget-wide before concluding "no history."

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

> **⚠️ Danger — reproduced and refined 2026-07-22**: linking via `transfer_id` when
> **both** sides of the pair are live-synced (non-null `imported_id`) can silently
> **delete the transactions** rather than link them — two real, `cleared: true`,
> bank-synced transactions vanished (balance dropped by exactly their combined amount); a
> fresh bank-sync restored them with new ids. **Rule: only worry when *both* sides are
> live-synced** — then don't link via this CLI pattern; leave the pair unlinked
> (transfer-shaped payee, no category) or use ActualBudget's UI. One-side-synced links
> (backfill insert ↔ live-synced counterpart) are safe. Full reproduction detail, dates,
> and the per-write flush requirement for multi-call links:
> `references/transfer-link-data-loss.md`.

**Direction-conditional rules for e-transfers (and any dual-role payee)**

For Interac e-Transfer payees, the category depends on direction — always create two rules per payee. The same applies to any payee that can plausibly appear on both sides of the ledger — most commonly an employer the user (or their spouse/partner) also pays for a separate service (e.g. an employer who is also paid for professional supervision, contracting, or rent). Before creating a flat payee→category rule, check: could this payee ever send money *and* receive money? If so, split into direction-conditional rules from the start, even if only one direction has prior history yet — a flat rule will silently mis-categorize the first transaction that comes in on the other side (e.g. tagging a salary deposit as spending).

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

**Step 7c — Retry previously unlinked transfers**

The account just reconciled may itself be the missing counterpart for a transfer some *other* account gave up on earlier. Read the unlinked-transfers registry in `docs/finance/learned-rules.md` and check each entry against the transactions just fetched in Step 6:

- Same matching rule as Step 7b (same/near date ±few days, opposite sign, matching amount).
- On a match: link the pair as a transfer, clear any stray category, and mark the registry entry resolved (self-evolve removes it — see Step 9).
- No match: leave the entry in place for next time.

This step costs little (the data is already in memory) and is how the registry actually shrinks — do not skip it just because this reconciliation "isn't about" the account that originally logged the entry.

---

**Step 8 — Build reconciliation report**

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
# Use the Telegram reply tool with chat_id from config.json's reporting.telegram_chat_id
# (ask the user for one and write it back via scripts/write_config.py if unset)
```

---

**Step 9 — Self-evolve**

After each successful reconciliation, invoke `workflows/self-evolve.md` to update learned rules.
