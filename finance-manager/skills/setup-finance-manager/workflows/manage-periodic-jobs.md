<required_reading>
references/config-schema.md
</required_reading>

<process>
**Creating a job** (from first-run-setup Step 7, add-account Step 5, or invoked directly):

1. Ask the cadence (default: daily) — matches the "sync after the day ends" pattern already
   used for the first wallet job in this workspace.
2. Build the task description for `cronjobs:add-job` covering: what to check (wallet
   descriptor via `query-mempool descriptor`, or an account via
   `actual-budget:query-budget bank-sync`), and where to report (`config.json`'s
   `reporting.telegram_chat_id` — ask the user for one if unset, then write it back via
   `scripts/write_config.py`; report only if something changed — new tx, balance change,
   sweep/spend detected — stay silent otherwise to avoid notification noise).
3. Store the returned job `id` into that account/wallet's `sync_job_id` in `config.json`
   (via `scripts/write_config.py`).

**Listing jobs:** Call `cronjobs:list-jobs`, cross-reference against `config.json`'s
`sync_job_id` fields to show which job belongs to which account/wallet (and flag any job
that exists in the cron list but isn't referenced by any config entry — orphaned).

**Removing a job:** Call `cronjobs:remove-job` with the id, then clear the corresponding
`sync_job_id` back to `null` in `config.json`.
</process>

<success_criteria>
- Every job created here has its id recorded in `config.json` — no untracked jobs
- Job task descriptions are self-contained enough that a fresh session firing the job knows
  exactly what to check and where to report, without needing this conversation's context
- Removal always updates both the cron job and `config.json` together
</success_criteria>
