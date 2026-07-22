<required_reading>
1. references/config-schema.md
2. references/markitdown-setup.md
</required_reading>

<process>
Runs when `~/.claude/channels/finance-manager/config.json` doesn't exist yet. Walk through
these steps in order, writing to config.json/credentials.json only at the end of each step
(via `scripts/write_config.py`) so partial progress survives an interruption.

**Step 1: Household members.** Ask who's being tracked (names). Assign each a short `id`
(lowercase, e.g. first name). Store under `household.members`.

**Step 2: Discover existing candidates.** Before asking the user to enumerate everything
from scratch, check what's already known:
- Read `docs/finance/account-map.md` if present — each row is a candidate account (has
  institution, account name, `actual_budget_id`, `on_budget`, and often a paperless
  correspondent/title pattern already).
- If `actual-budget:access` credentials exist, list real accounts via
  `actual-budget:query-budget` — anything not already covered by account-map.md is another
  candidate (name/ID only, nothing else known yet).
- If a Bitcoin wallet is mentioned or `~/.claude/channels/finance-manager/credentials.json`
  already has entries under `wallets`, those are wallet candidates.

Present the merged candidate list. For each, confirm/ask: ownership (`personal`/`joint`),
owner(s) from Step 1's household list, and (if not already implied by account-map.md) which
`reconciliation_mode` applies — `statement` or `bank_sync_only` (see Step 5).

**Step 3: Anything not yet discovered?** Ask if there are other banking institutions,
accounts, or hot/cold wallets not covered by Step 2. For each new one: institution/wallet
name, ownership, owners.

**Step 4: Connect services.**
- Actual Budget: if `~/.claude/channels/actual-budget/.env` doesn't exist, invoke
  `actual-budget:access` to walk through it. Mark `connections.actual_budget.connected`.
- Paperless-ngx: if `~/.claude/channels/paperless/.env` doesn't exist, invoke
  `paperless:access`. Then check whether MarkItDown is worth setting up — see
  `references/markitdown-setup.md`. Mark `connections.paperless.connected` and
  `connections.paperless.markitdown_configured`.
- Skip either if the user says they don't use it (e.g., no paperless instance — all
  accounts will be `bank_sync_only`).

**Step 5: Reconciliation mode per account** (skip wallets — they use `query-mempool`/
`reconcile-bitcoin-wallet` instead, not paperless). For each account without a mode already
set from Step 2: will documents (statements/transaction reports) be received via paperless
for this account, or does Actual Budget's own bank sync fully cover it? If statement-based
and no existing paperless correspondent/title-pattern is known, ask for them (or defer —
`manage-paperless-workflows` can resolve these later against a real sample document).

**Step 6: Categories.** Confirm the household's Actual Budget category structure already
exists (list categories via `actual-budget:query-budget`). This step only documents that
categories exist — it doesn't design a category tree. Ongoing categorization heuristics are
`learned-rules.md`'s job, unrelated to this setup.

**Step 7: Periodic sync jobs.** For each wallet (and any account whose `reconciliation_mode`
is `bank_sync_only`, since those benefit from a scheduled bank-sync trigger), ask whether to
set up a periodic sync job. See `workflows/manage-periodic-jobs.md` for how a job gets
created and its ID stored in `sync_job_id`.

**Step 8: Write and confirm.** Assemble the full config, write via `scripts/write_config.py`
to a temp path first, then run it for real (see the script's own validate-then-atomic-replace
behavior). If `docs/finance/account-map.md` had rows that got imported, add a one-line
header note there marking it superseded by `config.json` (keep the file — audit trail, don't
delete). Report a summary: household size, accounts/wallets tracked, connections made, jobs
created.
</process>

<success_criteria>
- `config.json` and (if any wallets) `credentials.json` exist and validate as JSON
- Every account/wallet discovered from `account-map.md` or the real Actual Budget account
  list was either imported or explicitly asked about — none silently skipped
- `account-map.md` (if it existed) has its superseded-note, still present on disk
- Every account has a `reconciliation_mode`; every `statement`-mode account has (or is
  flagged as still needing) a correspondent/title pattern
</success_criteria>
