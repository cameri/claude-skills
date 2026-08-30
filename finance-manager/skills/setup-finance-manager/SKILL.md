---
name: setup-finance-manager
description: Onboards the finance-manager plugin for first use (household members, bank accounts, hot/cold wallets, ownership, connecting Actual Budget and Paperless-ngx, per-account reconciliation mode, periodic sync jobs), or reviews/adds/removes tracked accounts and wallets on subsequent runs. Use when the user asks to set up finance-manager, configure accounts/wallets, connect Actual Budget or Paperless-ngx for the first time, or review/add/remove tracked accounts.
---

<objective>
Onboards the finance-manager plugin for first use — household members, bank accounts,
hot/cold wallets and ownership, connections to Actual Budget and Paperless-ngx, per-account
reconciliation mode, and periodic sync jobs — and reviews/adds/removes tracked accounts and
wallets on later runs. Configuration lives in `~/.claude/channels/finance-manager/`
(`config.json` + `credentials.json`) rather than inside the plugin or `docs/finance/`, so
the plugin stays portable and credentials never enter a git-tracked repo.
</objective>

<quick_start>
If `~/.claude/channels/finance-manager/config.json` doesn't exist yet → this is first-run
onboarding: go straight to `workflows/first-run-setup.md`. If it exists, route via
`<routing>` below (add / remove / review / periodic jobs / redo).
</quick_start>

<essential_principles>
**Config lives outside the plugin and outside `docs/finance/`.** Structure/status goes in
`~/.claude/channels/finance-manager/config.json`; wallet descriptors (credential-like — they
reveal full balance/address history) go in `~/.claude/channels/finance-manager/credentials.json`.
Neither is ever written into this plugin's own directory (breaks plugin
portability) or `docs/finance/` (that's a git repo pushed to a remote; the channels
directory never is).

**All writes are atomic.** Never edit `config.json`/`credentials.json` directly — always via
`scripts/write_config.py` (write to a temp file in the same directory, parse it back and
diff-check against the intended content, then atomic rename). A crash mid-write must never
leave a corrupted or partial config on disk.

**Removing a tracked account/wallet never deletes real data.** It only stops this plugin
from prompting about or syncing it. Actual Budget accounts, paperless correspondents/
workflows, and on-chain wallet funds are never touched by this skill.

**First run vs. later runs is just "does config.json exist yet."** No separate flag needed.
</essential_principles>

<intake>
Check whether `~/.claude/channels/finance-manager/config.json` exists.

- **Doesn't exist** → this is first-run onboarding. Go straight to
  `workflows/first-run-setup.md`.
- **Exists** → ask what to do:
  1. Add an account or wallet
  2. Remove a tracked account or wallet
  3. Review current setup
  4. Manage periodic sync jobs
  5. Re-run full setup from scratch (rare — confirm this is really wanted, since it re-asks
     everything; usually "add" is what's actually needed)

**Wait for response before proceeding**, unless intent is already unambiguous from how the
user asked (e.g. "add my new brokerage account" clearly means option 1).
</intake>

<routing>
| Response | Workflow |
|---|---|
| First run (no config.json) | `workflows/first-run-setup.md` |
| 1, "add" | `workflows/add-account.md` |
| 2, "remove" | `workflows/remove-account.md` |
| 3, "review", "status", "list" | `workflows/review-config.md` |
| 4, "jobs", "sync", "periodic" | `workflows/manage-periodic-jobs.md` |
| 5, "start over", "redo" | Confirm, then `workflows/first-run-setup.md` |

**After reading the workflow, follow it exactly.**
</routing>

<reference_index>
- `references/config-schema.md` — `config.json`/`credentials.json` structure, field
  meanings, and the `account-map.md` migration approach
- `references/markitdown-setup.md` — when/how to offer MarkItDown setup for a paperless-ngx
  instance during the connect-services step
</reference_index>

<workflows_index>
| Workflow | Purpose |
|---|---|
| first-run-setup.md | Full onboarding: household → accounts/wallets → connections → reconciliation mode → categories → sync jobs |
| add-account.md | Add one new account or wallet to an existing config |
| remove-account.md | Untrack an account/wallet (never deletes real data) |
| review-config.md | Display current tracked state (never prints credentials) |
| manage-periodic-jobs.md | Create/list/remove per-account sync cron jobs, keeping `config.json`'s `sync_job_id` in sync |
</workflows_index>

<success_criteria>
- `config.json` always validates as JSON after any write; `credentials.json` is `chmod 600`
- Every write goes through `scripts/write_config.py` — never a direct file edit
- Wallet descriptors never appear in `config.json`, `docs/finance/`, or any chat/terminal
  output beyond what's strictly needed at entry time
- Existing `docs/finance/account-map.md` data is offered for import, not silently ignored,
  on first run
</success_criteria>

<dependencies>
- `~/.claude/channels/actual-budget/.env` — via `actual-budget:access`
- `~/.claude/channels/paperless/.env` — via `paperless:access`
- `../reconcile-statement/references/cli-setup.md` — `$ACTUAL` CLI bootstrap and the
  mutating-command flush requirement (renaming accounts needs both)
- `cronjobs` plugin — periodic sync job creation/removal
</dependencies>
