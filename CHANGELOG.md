# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [telegram-ng 0.1.0] - 2026-08-13

### Added
- New plugin: `telegram-ng`. Straight fork of Anthropic's official `telegram`
  plugin (claude-plugins-official, v0.0.6) — same server.ts/grammy
  implementation, ACCESS.md, and access/configure skills, with all
  `/telegram:*` command references renamed to `/telegram-ng:*` so it doesn't
  collide with the official plugin's tools. Credential path
  (`~/.claude/channels/telegram/`) deliberately left unchanged so it shares
  the same bot token/access list at cutover time. No functional changes from
  upstream. The existing `telegram/` plugin (skills-only, no MCP server — it
  predates this fork and was never wired up) is untouched. Not yet enabled;
  the official plugin remains the live driver for this workspace pending a
  follow-up cutover pass.

## [finance-manager 0.11.0] - 2026-08-12

### Changed
- Portability/OSINT sweep: replaced real names, a real institution (RBC),
  real account/wallet UUIDs, a real cron job ID, and brand-specific wallet
  examples (Bitkey/ShakePay/Ledn) throughout `setup-finance-manager`,
  `manage-paperless-workflows`, `reconcile-statement`, and `query-mempool`
  with generic placeholders. Added a `reporting.telegram_chat_id` field to
  `config.json` (see `setup-finance-manager/references/config-schema.md`)
  and routed every skill that previously hardcoded a literal Telegram chat
  ID through it instead. Genericized hardcoded Canada/RRSP/TFSA/CAD
  assumptions in `review-finances` to read the household's jurisdiction and
  base currency from `docs/finance/financial-profile.md`, consistent with
  how `financial-planner.md` already worked. No behavior change for the
  workspace this plugin was built in — `docs/finance/` still supplies all
  the same real data at runtime.

## [simple-english 1.0.0] - 2026-08-09

### Added
- New plugin: `simple-english`. Writes and rewrites technical text with
  ASD-STE100 Simplified Technical English — classifies text as procedural or
  descriptive, applies the standard's 53-rule catalog (20/25-word sentence
  limits, one word one meaning, simple tenses, active voice, condition
  before command), and runs a mandatory self-check before delivering.
  Promoted from the workspace-level `.agents/skills/simple-english` skill
  into the marketplace so it's available as a portable plugin.

## [executable-skepticism 0.1.0] - 2026-08-05

### Added
- New plugin: `executable-skepticism`. Verification protocol for evaluating
  theories, papers, models, or any confident quantitative claim (including
  Claude's own) by routing the verdict through executable, falsifiable tests
  instead of prose — operationalize the claim, register numbered numeric
  predictions before running any code, execute deterministically (preferring
  the user's own hands), then adjudicate symmetrically with failures first
  and derived-vs-installed results called out.

## [finance-manager 0.10.0] - 2026-08-08

### Added
- `query-mempool`'s `mempool_cli.py descriptor` now paces successive address
  lookups with a `--request-delay` (default 0.5s) instead of firing requests
  as fast as possible and only reacting after a 429 — proactive, not just
  reactive, since mempool.space doesn't publish its rate-limit thresholds.
- 429 responses that carry a `Retry-After` header (delta-seconds or HTTP-date)
  now have that value honored in place of the exponential backoff schedule,
  bounded by a new `RATE_LIMIT_MAX_SLEEP_SECONDS` (60s) ceiling so a malformed
  or hostile value can't hang the CLI. Falls back to the existing 1s/2s/4s
  exponential schedule when the header is absent, as before.
- `descriptor` results now report `last_scanned_index` (the highest address
  index actually checked across all branches), and a new `--start-index` flag
  lets a caller resume scanning from there next run instead of re-deriving
  and re-querying every address from 0 — for a wallet that never reuses
  addresses, a full re-scan on every check is pure waste once the used-address
  frontier is known.
- Prompted by a real Bitkey wallet check repeatedly timing out at gap-limit
  60-100 (needed to cover the wallet's 55 known-used addresses) even after
  the existing exponential-backoff/fallback-provider mitigations.

## [finance-manager 0.8.0] - 2026-07-26

### Added
- `query-mempool`'s `mempool_cli.py` now retries HTTP 429 (rate limited) responses
  with exponential backoff (1s/2s/4s, 3 retries by default) before giving up on a
  provider, and automatically falls back to Blockstream's Esplora
  (`blockstream.info/api`) for mainnet/testnet when mempool.space is still
  rate-limited or unreachable - same API shape, no API key needed, so it's a
  drop-in base-URL swap. Signet has no public fallback. An explicit `--api-url`
  disables fallback entirely (assumed to mean "use exactly this instance").
  Prompted by hitting mempool.space's rate limit repeatedly during a real Bitkey
  wallet reconciliation (paging through descriptor-derived addresses).

## [finance-manager 0.7.3] - 2026-07-26

### Added
- `reconcile-statement` workflow and `backfill-verification.md` now capture three
  more lessons from a second same-day reconciliation (RBC Mastercard, ~6-month
  payment-sync gap): (1) a confirmed hypothesis about *which* transaction type
  stopped syncing can mask a second, smaller dropout of a different type in the
  same months — diff every statement line regardless; (2) prefer linking an
  already-synced-but-unlinked counterpart transaction found in another tracked
  account over inserting a fresh transfer pair; (3) the transfer-linking danger
  note now cross-references the CLI's flush-after-every-write requirement, since
  linking one pair takes two sequential `transactions update` calls and it's easy
  to batch them without flushing between. Also documents that reconciling against
  a live (not-yet-statemented) "current balance" only supports spot-checking, not
  chain verification — small residuals from pending/uncleared transactions are
  expected there, not reconciliation errors.

## [finance-manager 0.7.2] - 2026-07-26

### Added
- `reconcile-statement`'s `backfill-verification.md` now documents diagnosing
  scattered drift on an already-live-synced account (sync silently dropping
  specific transactions in specific months, not a clean multi-month gap): find a
  self-consistent checkpoint boundary instead of assuming a backfill must reach
  account inception, then diff each period's own net change against
  ActualBudget's to pinpoint exactly which months need attention before touching
  any data. Derived from a real reconciliation (RBC Chequing Arturo, 2026-07-26)
  that fixed a ~$25,500 drift this way.

## [journal 0.1.1] - 2026-07-25

### Fixed
- `extract_sessions.py`'s `collect_digest` now guards the mtime pre-filter's `stat()`
  call against `OSError` (a transcript deleted/rotated mid-scan no longer crashes a
  cold-start reconstruction).
- `update-journal` SKILL.md's write step now instructs re-verifying `status: open`
  immediately before any edit, tightening the closed-journal-immutability invariant.
- `test_extract_sessions.py`'s subprocess CLI test now has a 30s timeout.

Findings from the final whole-branch review of the initial implementation — see
`docs/superpowers/plans/2026-07-25-journal-plugin.md`.

## [journal 0.1.0] - 2026-07-25

### Added
- New `journal` plugin: `update-journal` skill keeps a series of narrative journals
  at `docs/journal/` in the workspace repo, written from Claude's own perspective by
  reading session transcripts across every project on this machine (via the new
  dependency-free `extract_sessions.py`) plus the memory system. Journals are
  manually invoked, cycle-boundary judgment is a per-run call (not a fixed
  schedule), and a closed journal is never edited again.

## [sandbox-manager 0.4.2] - 2026-07-24

### Fixed
- `manage-plugins`: clarified that `claude plugin marketplace update` only refreshes a
  marketplace's manifest and does **not** pull a new version of an already-installed plugin
  into the cache — confirmed by testing (updated the marketplace, `claude plugin list` still
  showed the stale version, and only `claude plugin update <plugin-name>@<marketplace-name>`
  actually pulled the new one in). The workflow now always follows a marketplace update with
  a plugin update when the goal is making the latest changes usable, not just checking what's
  available.

## [sandbox-manager 0.4.1] - 2026-07-24

### Fixed
- `branch-session`: corrected `essential_principles` after live testing — `/branch` switches
  the current pane into the new branched session rather than leaving the original active with
  a passive fork created elsewhere. The original session is left intact and resumable, but this
  pane changes which conversation it's running, same as `/resume`.

## [sandbox-manager 0.4.0] - 2026-07-23

### Added
- `background-session` skill: fires automatically on a `/background` channel message; sends
  `/background` + Enter, which hands the current work off to a background agent and frees
  the interactive pane. Confirmed with cameri that `/background` is a real Claude Code
  command (not Ctrl-Z/`bg`/`fg`), which is why the entry below was initially deferred.

## [sandbox-manager 0.3.0] - 2026-07-23

### Added
- `exit-session` skill: fires automatically on an `/exit` channel message; sends `/exit` +
  Enter to the tmux pane, ending the process. Relies on something outside the pane (a
  supervisor or container restart policy) to bring it back — confirmed viable in this
  deployment since `containers/claude-sandboxed/compose.yml` runs with `restart: unless-stopped`.
- `rename-session` skill: fires on a `/rename <name>` channel message; sends `/rename <name>` +
  Enter to name the current session.
- `resume-session` skill: fires on a `/resume <name>` channel message; sends `/resume <name>` +
  Enter to switch the pane to a different, previously named session. Always requires a name —
  a bare `/resume` opens an interactive picker that can't be driven by scripted keystrokes.
- `branch-session` skill: fires automatically on a `/branch` channel message; sends `/branch` +
  Enter to fork the conversation at the current point without disturbing the original.
- `export-session` skill: fires on an `/export <path>` (or bare `/export`) channel message;
  sends `/export <path>` + Enter to write the conversation to a file. With no path given,
  defaults to `docs/<slug>`, where `<slug>` is generated from a summary of the conversation
  before the script runs.
- `rename-session`, `resume-session`, and `export-session` send user-supplied text via
  `tmux send-keys -l` so it can't be misread as tmux key names.

### Deferred
- A `/background` skill (send the session to the background, freeing the terminal) was
  requested but not implemented: in this deployment the container's PID 1 is literally
  `tmux attach -t claude` (see `containers/claude-sandboxed/compose.yml`), so detaching that
  client — or suspending the `claude` process, which has no wrapping shell in the pane to
  later run `fg` from — tears down or freezes the whole sandbox instead of just freeing the
  terminal. Needs a decision on how to handle this before it can be built safely.

## [sandbox-manager 0.2.0] - 2026-07-23

### Added
- `manage-plugins` skill: adds/removes marketplaces and installs/updates/enables/disables/
  uninstalls plugins via the non-interactive `claude plugin ...` CLI (synchronous, no polling
  needed), then runs `scripts/reload-plugins.sh` to send `/reload-plugins` to this session's own
  tmux pane so the change applies without a full restart — `/reload-plugins` has no CLI
  equivalent, unlike marketplace/install/update/enable/disable/uninstall.

## [sandbox-manager 0.1.0] - 2026-07-23

### Added
- New plugin: manages the Claude Code sandbox itself.
- `restart-session` skill: fires automatically on a `/clear` channel message (e.g. Telegram);
  runs `scripts/restart-session.sh`, which auto-discovers the current tmux pane, verifies it's
  actually running Claude Code, and sends `/clear` + Enter to reset the session on remote request.

## [finance-manager 0.6.3] - 2026-07-22

### Fixed
- `manage-paperless-workflows/references/troubleshooting.md`: documented that the
  `documents/bulk_edit/` `reprocess` method does **not** retroactively re-evaluate workflow
  triggers (only re-runs content extraction) — discovered while backfilling Amex/CIBC/
  Tangerine statements that predated their workflows. `PATCH`-ing a real field (e.g. `title`
  to its own value) reliably fires the "Document Updated" trigger instead; there is no
  dedicated `run_workflows` bulk-edit method in this API version.

### Changed
- Completed a full statement backfill this session (executed live, not shipped as plugin
  code): 19 Amex, 13 CIBC, and 26 Tangerine (Chequing/Line of Credit/Mastercard) documents
  tagged and reconciled. Surfaced and corrected a real gap in the "safe to link transfers"
  guidance in `docs/finance/learned-rules.md` — "both sides manual = safe" was disproven by
  a live deletion during the Tangerine LOC↔Chequing linking attempt; the working rule is now
  "don't rely on either side's sync status as a safety guarantee, snapshot before linking."

## [finance-manager 0.6.2] - 2026-07-22

### Changed
- `reconcile-statement` and `manage-paperless-workflows` now read account/correspondent
  mappings from `~/.claude/channels/finance-manager/config.json` instead of
  `docs/finance/account-map.md` — the migration this workspace's first
  `setup-finance-manager` run actually performed. `account-map.md` stays on disk as a
  historical record but is no longer read by either workflow.
- `setup-finance-manager`: added `manual_csv` as a third `reconciliation_mode` (alongside
  `statement` and `bank_sync_only`) for institutions with neither a paperless correspondent
  nor a live bank-sync connector (crypto exchanges, custodial loan accounts) — needed once
  real accounts (ShakePay, Ledn) were run through first-run setup.

### Fixed
- `first-run-setup.md`'s discovery step used to imply only two `reconciliation_mode` values
  existed; corrected to reflect the three actually supported.

### Changed
- `setup-finance-manager/workflows/first-run-setup.md`: reordered so Step 1 now connects
  Actual Budget and lists real accounts *before* asking anything else (grounds later
  questions in real data instead of asking blind). Added account-name standardization: for
  any account without an existing identifying suffix, ask for the last 4-5 digits and rename
  it via `accounts update <id> --name "..."` (skipping wallets/exchanges, which aren't
  numbered bank accounts) — flushing via `budgets download` after each rename per the
  existing encrypted-budget CLI mutating-command requirement in
  `reconcile-statement/references/cli-setup.md`.

## [finance-manager 0.6.0] - 2026-07-22

### Added
- New skill `setup-finance-manager`: onboards the plugin for first use (household members,
  bank accounts, hot/cold wallets, ownership, connecting Actual Budget and Paperless-ngx,
  per-account reconciliation mode, periodic sync jobs), and on later runs reviews/adds/
  removes tracked accounts and wallets. Introduces
  `~/.claude/channels/finance-manager/config.json` (structure/status) and
  `~/.claude/channels/finance-manager/credentials.json` (wallet descriptors — never in the
  plugin dir or `docs/finance/`), both written exclusively through
  `scripts/write_config.py`'s write-temp → validate → atomic-replace pattern so a crash
  mid-write can't corrupt the config. Includes a `references/markitdown-setup.md` reference
  for offering MarkItDown PDF-parser setup when connecting a fresh paperless-ngx instance.
  First run offers to import existing `docs/finance/account-map.md` rows as candidate
  accounts rather than re-asking from scratch (actual migration/consolidation happens the
  first time the new skill is run, not as part of this release).

## [finance-manager 0.5.0] - 2026-07-22

### Added
- New skill `query-mempool`: CLI (`scripts/mempool_cli.py`) wrapping the public mempool.space
  REST API — look up a transaction by txid, an address's balance/history, or aggregate
  balance/history across a wallet descriptor (single-sig or multisig, including BIP389
  multipath descriptors like Bitkey's `wsh(sortedmulti(2, ...))`) via bdkpython-driven
  address derivation with gap-limit scanning. Table output by default, `--json` for
  structured output. Every list-returning command (`address`'s tx history, `descriptor`'s
  used-addresses list) is paginated at 25/page via `--page`. Built for the deferred Bitkey
  ↔ mempool.space reconciliation work (`docs/finance/bitkey-mempool-reconciliation-todo.md`
  in the workspace repo) — this skill only adds the mempool.space lookup capability itself,
  not the reconciliation logic.
- Discovered live (docs were misleading): mempool.space's confirmed-address-history
  pagination cursor is a **path** segment (`GET
  /address/:address/txs/chain/:last_seen_txid`), not the `?after_txid=` query parameter the
  reference docs' phrasing suggested — the query-param form is silently accepted but
  ignored and just returns page 1 again.

## [finance-manager 0.4.2] - 2026-07-22

### Changed
- `reconcile-statement.md`: refined the 0.4.1 transfer-linking danger warning after same-day follow-up testing — the deletion only reproduces when *both* sides of the pair are already live bank-synced (non-null `imported_id`). Linking one bank-synced side to one manually-inserted backfill transaction is safe and was used successfully for 7 more links later the same day. Updated guidance: only avoid the CLI update pattern when both sides are already-synced data; test a single pair with a balance check first if you must.

## [finance-manager 0.4.1] - 2026-07-22

### Fixed
- `reconcile-statement.md`: added a hard warning against linking transfers via `updateTransaction({ transfer_id })` when either side has a non-null `imported_id` (live bank-synced) — reproduced today: two real, cleared, bank-synced transactions were silently *deleted* (not just left unlinked) by this exact pattern, confirmed by the account balance dropping by their combined amount. A fresh bank-sync on the affected account restored them safely. Every transfer link made on manually-inserted (non-bank-synced) transactions during today's backfills was unaffected — the risk is specific to linking already-live-synced transactions this way.

## [finance-manager 0.4.0] - 2026-07-22

### Added
- Unlinked-transfers registry: when a transfer counterpart isn't found in any currently-tracked account, the transaction is now recorded in a persistent worklist (`unlinked_transfer` entries in `docs/finance/learned-rules.md`) instead of just being flagged and forgotten. New `reconcile-statement.md` Step 7c retries every open entry against the account just reconciled/backfilled, since the missing counterpart often turns out to live in an account that simply hadn't been backfilled yet. Entries are removed once linked. `self-evolve.md` maintains the registry (add/remove) each run.
- `references/backfill-verification.md` — technique reference for reconciling a multi-period gap: verifying the running-balance chain across every statement before inserting anything, deriving transaction sign from balance deltas rather than OCR column position (catches transcription sign errors that pass a local "looks plausible" check), two recurring OCR table-parsing pitfalls (header/data column misalignment, multi-row blocks disguised as single blocks), a derived-expectation validation method for accounts whose absolute ledger balance has drifted from real statement figures for reasons predating the current backfill, and avoiding duplicate inserts at a live-sync boundary.
- `reconcile-statement.md`: before searching other accounts for a transfer counterpart, check for a same-account fee-reversal pattern first (a same-amount credit shortly after a matching charge is very often the institution reversing that exact fee, not new income or a transfer).
- `reconcile-statement.md`: the categorization certainty-bar check now searches for payee/pattern precedent budget-wide, not just on the account being reconciled — a payee can have established history on a different account.

### Changed
- Removed one bank-specific transfer-payee example from `reconcile-statement.md` in favor of only the generic ones, keeping the guidance portable.

## [finance-manager 0.3.0] - 2026-07-20

### Added
- `manage-paperless-workflows/references/troubleshooting.md` — how to read paperless-ngx container logs and a document's history API (`/api/documents/<id>/history/`) to diagnose whether a workflow fired, whether a `reprocess` bulk-edit action actually changed a document's content, and whether an extraction-quality issue (e.g. scrambled table layouts) is a stale-processing artifact or inherent to the currently configured processor. Linked from `reconcile-statement.md`'s untriaged-document detection step.

## [finance-manager 0.2.1] - 2026-07-19

### Changed
- `reconcile-statement` workflow: added a "transfers take priority over categories" step — payees like "Online Banking Transfer", "BR to BR", "Payment", or "Payment Adjustment" must never be categorized as fees/income by default; always search other tracked accounts for a matching transaction and link as a transfer instead. Added an explicit certainty bar for categorization (only categorize with an existing rule or fully consistent payee history — never guess).
- Generalized the "direction-conditional rules" guidance beyond Interac e-transfers to any payee that can plausibly appear on both sides of the ledger (e.g. an employer who is also paid for a separate service) — a flat payee→category rule silently mis-categorizes the first transaction on the untested direction.

### Fixed
- `references/cli-setup.md`: documented the `encrypt-failure`/`missing-key` sync-push bug on E2E-encrypted budgets — write commands apply locally but fail to push, and every subsequent command fails until the queue is flushed with an explicit `budgets download --encryption-password` after each individual write.

## [actual-budget 0.1.4] - 2026-07-19

### Fixed
- `references/cli-setup.md`: documented the same `encrypt-failure`/`missing-key` sync-push issue found while using this CLI from finance-manager — the fix is to flush with `budgets download --encryption-password` after every mutating command, one at a time.

## [actual-budget 0.1.3] - 2026-07-19

### Fixed
- CLI setup snippet now uses `set -a` around `source`ing the credential `.env` file, so `ACTUAL_DATA_DIR` and `ACTUAL_ENCRYPTION_PASSWORD` (and any future keys) are actually exported to the CLI subprocess. Previously only `ACTUAL_SERVER_URL`, `ACTUAL_PASSWORD`, and `ACTUAL_SYNC_ID` were exported, so any budget with a custom data directory or E2E encryption enabled would fail to load with a cryptic "unknown problem opening" / `missing-key` error.

## [github-manager 0.3.0] - 2026-05-01

### Added
- `create-stories` skill — parses a PRD and batch-creates a parent-child GitHub issue hierarchy (stories + sub-issues) with milestone assignment and project board integration

## [commands] - 2026-03-30

### Removed
- `/improve-skill` — superseded by the `audit-skill` workflow in the `create-agent-skills` skill (taches-cc-resources), which now includes severity tiers and degrees-of-freedom checks

## [github-manager 0.2.1] - 2026-03-30

### Changed
- Trimmed all skill descriptions for token efficiency — removed boilerplate preamble while preserving trigger conditions and behavior summaries

## [autoresearch 0.1.2] - 2026-03-29
## [docker-maintenance 0.2.1] - 2026-03-29
## [elevenlabs 0.1.3] - 2026-03-29
## [nats 0.0.5] - 2026-03-29
## [scheduler 0.0.2] - 2026-03-29
## [technitium-dns 0.2.2] - 2026-03-29

### Changed
- Trimmed skill descriptions to reduce context token usage — removed verbose preamble and redundant examples while preserving semantic triggers

## [elevenlabs 0.1.2] - 2026-03-29
## [nats 0.0.4] - 2026-03-29
## [nostr 0.1.17] - 2026-03-29
## [paperless 0.0.4] - 2026-03-29
## [wallabag 0.0.2] - 2026-03-29

### Changed
- Renamed credential skill to `access` to follow the standard plugin naming convention: elevenlabs (setup-api-key), nats (configure-nats), paperless (configure-paperless), wallabag (configure-wallabag)
- nostr and telegram retain `configure` — both already have a distinct `access` skill for pairing/allowlist management

## [actual-budget 0.1.1] - 2026-03-28

### Changed
- Renamed `configure-actual` skill to `access` to follow the standard plugin naming convention

## [technitium-dns 0.2.1] - 2026-03-28

### Changed
- Renamed `configure-technitium` skill to `access` to follow the standard plugin naming convention

## [home-assistant 0.1.0] - 2026-03-28

### Added
- Initial release: interact with Home Assistant via REST API using httpie
- `access` skill: configure HA_URL and HA_TOKEN, test connection
- `get-state` skill: get single entity state or list all entities (with domain filter)
- `call-service` skill: call HA services to control devices and trigger automations
- `set-state` skill: create or update entity state directly in HA state machine
- `fire-event` skill: fire custom HA events for automation triggers
- `render-template` skill: render Jinja2 templates for testing and debugging
- `query-history` skill: query state history and logbook with time range filters

## [autoresearch 0.1.1] - 2026-03-28

### Added
- Initial release: autonomously optimize Claude Code skills using binary evals, prompt mutation, and iterative improvement loops

## [docker-maintenance 0.2.0] - 2026-03-28

### Added
- Initial release: update base images, pin sha256 digests, manage Containerfile/Dockerfile dependencies, test builds, and log changes

## [netshoot 0.1.0] - 2026-03-28

### Added
- Initial release: network troubleshooting inside Docker container networks using nicolaka/netshoot

## [elevenlabs 0.1.1] - 2026-03-28

### Added
- `references/premade-voices.md`: full list of 45 premade voices with IDs, gender, accent, and use case
- Credit conservation guidance in text-to-speech skill (avoid filler text to reduce character usage)
- Expanded voice table with accent and use case details

## [jj] - 2026-03-28

### Added
- Document that jj does not support git submodules; use `git` directly for submodule operations
- Warning about `jj restore` accidentally deleting files that are absent in the source revision, with pre-flight checklist

## [technitium-dns 0.2.0] - 2026-03-28

### Added
- `manage-blocking` skill: check if a domain is blocked or allowed, add/remove per-domain allow/block overrides, manage block list URLs, force block list updates, and enable/disable blocking globally (including timed temporary disable)
- `.claude-plugin/plugin.json`: initial plugin manifest (was missing)
- Updated marketplace.json description to reflect blocking capabilities
