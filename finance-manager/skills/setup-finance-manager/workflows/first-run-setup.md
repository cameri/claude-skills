<required_reading>
1. references/config-schema.md
2. references/markitdown-setup.md
3. ../../reconcile-statement/references/cli-setup.md — `$ACTUAL` CLI bootstrap, and the
   mutating-command flush requirement needed in Step 1 below
</required_reading>

<process>
Runs when `~/.claude/channels/finance-manager/config.json` doesn't exist yet. Writes to
config.json/credentials.json only at the end of each step (via `scripts/write_config.py`) so
partial progress survives an interruption.

**Step 1: Connect Actual Budget and standardize account names.** Do this first — real
account data grounds every later step instead of asking abstract questions blind.

1. If `~/.claude/channels/actual-budget/.env` doesn't exist, invoke `actual-budget:access`
   to walk through it.
2. List real accounts (`$ACTUAL accounts list --format json`, per `cli-setup.md`).
3. For each account, check whether its name already ends in an identifying suffix (e.g.
   `*2377`, `*5852` — most already do). For any that don't, ask the user for the last 4-5
   digits of that account (used later to disambiguate same-institution statement titles,
   same purpose `account-map.md`'s "Title Pattern" column already served). Skip this ask for
   anything that's clearly a wallet/crypto/exchange account, not a numbered bank account
   (e.g. a Bitcoin wallet, ShakePay, Ledn) — those get identified differently in Step 4, not
   by digits.
4. Show the full list of proposed renames (`old name` → `new name`) and confirm before
   applying anything.
5. Apply each rename: `$ACTUAL accounts update <id> --name "<original> *<digits>"`. This is
   a mutating command — immediately run `$ACTUAL budgets download "$ACTUAL_SYNC_ID"
   --encryption-password "$ACTUAL_ENCRYPTION_PASSWORD"` after **each** rename before doing
   the next one, per `cli-setup.md`'s flush requirement. Do not batch renames without
   flushing between them.
6. Re-list accounts to confirm the renames applied. Mark `connections.actual_budget.connected`.

**Step 2: Household members.** Ask who's being tracked (names). Assign each a short `id`
(lowercase, e.g. first name). Store under `household.members`.

**Step 3: Discover remaining candidates.** Cross-reference the (now-renamed) Actual Budget
account list against:
- `docs/finance/account-map.md`, if present — rows here already have institution, account
  name, `actual_budget_id`, `on_budget`, and often a paperless correspondent/title pattern.
- Anything in the Actual Budget list not covered by account-map.md is another candidate
  (name/ID only, nothing else known yet).
- Any entries already in `~/.claude/channels/finance-manager/credentials.json` under
  `wallets` are wallet candidates.

Present the merged candidate list. For each, confirm/ask: ownership (`personal`/`joint`),
owner(s) from Step 2's household list, and (if not already implied by account-map.md) which
`reconciliation_mode` applies — `statement` or `bank_sync_only` (see Step 6).

**Step 4: Anything not yet discovered?** Ask if there are other banking institutions,
accounts, or hot/cold wallets not covered by Step 3. For each new one: institution/wallet
name, ownership, owners. For a new wallet, get the descriptor and write it to
`credentials.json` (never `config.json` or `docs/finance/`).

**Step 5: Connect Paperless-ngx.**
- If `~/.claude/channels/paperless/.env` doesn't exist, invoke `paperless:access`.
- Then check whether MarkItDown is worth setting up — see `references/markitdown-setup.md`.
- Mark `connections.paperless.connected` and `connections.paperless.markitdown_configured`.
- Skip if the user says they don't use paperless — all accounts become `bank_sync_only`.

**Step 6: Reconciliation mode per account** (skip wallets — they use `query-mempool`/
`reconcile-bitcoin-wallet` instead, not paperless). For each account without a mode already
set from Step 3: will documents (statements/transaction reports) be received via paperless
for this account, or does Actual Budget's own bank sync fully cover it? If statement-based
and no existing paperless correspondent/title-pattern is known, ask for them (or defer —
`manage-paperless-workflows` can resolve these later against a real sample document). The
last-4/5 digits from Step 1 are exactly what a title pattern usually keys off.

**Step 7: Categories.** Confirm the household's Actual Budget category structure already
exists (list categories via `actual-budget:query-budget`). This step only documents that
categories exist — it doesn't design a category tree. Ongoing categorization heuristics are
`learned-rules.md`'s job, unrelated to this setup.

**Step 8: Periodic sync jobs.** For each wallet (and any account whose `reconciliation_mode`
is `bank_sync_only`, since those benefit from a scheduled bank-sync trigger), ask whether to
set up a periodic sync job. See `workflows/manage-periodic-jobs.md` for how a job gets
created and its ID stored in `sync_job_id`.

**Step 9: Write and confirm.** Assemble the full config, write via `scripts/write_config.py`
(temp path first, then the real path — see the script's own validate-then-atomic-replace
behavior). If `docs/finance/account-map.md` had rows that got imported, add a one-line
header note there marking it superseded by `config.json` (keep the file — audit trail, don't
delete). Report a summary: accounts renamed, household size, accounts/wallets tracked,
connections made, jobs created.
</process>

<success_criteria>
- Every Actual Budget account that needed a last-4/5-digit suffix has one, applied via the
  CLI (not just recorded in config) and flushed after each rename
- `config.json` and (if any wallets) `credentials.json` exist and validate as JSON
- Every account/wallet discovered from the Actual Budget list or `account-map.md` was either
  imported or explicitly asked about — none silently skipped
- `account-map.md` (if it existed) has its superseded-note, still present on disk
- Every account has a `reconciliation_mode`; every `statement`-mode account has (or is
  flagged as still needing) a correspondent/title pattern
</success_criteria>
