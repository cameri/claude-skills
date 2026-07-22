<required_reading>
references/config-schema.md
</required_reading>

<process>
1. Identify the account/wallet to remove (by name or id) from `config.json`.
2. If it has a `sync_job_id`, ask whether to also remove that periodic job (via
   `cronjobs`'s remove-job) or just leave the job running unattached. Removing the config
   entry does not remove the job automatically — confirm explicitly.
3. **Never delete real data.** Removing an entry here only stops this plugin from tracking
   it (no more setup-flow prompts about it, no more periodic sync). It does not delete or
   modify the account in Actual Budget, does not remove paperless correspondents/workflows,
   and does not touch any wallet's on-chain funds (there's nothing to touch — descriptors
   are read-only view keys).
4. Confirm with the user before writing — show exactly which entry will be removed.
5. Remove the entry, write the updated config via `scripts/write_config.py`. If it was a
   wallet, ask whether to also remove its `credentials.json` entry (default: keep it — cheap
   to keep, easy to re-add the account entry later without re-requesting the descriptor).
</process>

<success_criteria>
- Confirmed with user before any write
- Only the targeted entry is removed; rest of config.json byte-identical otherwise
- No side effects outside this plugin's own config/credentials files unless the user
  explicitly asked to also remove the cron job
</success_criteria>
