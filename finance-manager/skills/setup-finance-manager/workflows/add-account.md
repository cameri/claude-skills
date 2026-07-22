<required_reading>
references/config-schema.md
</required_reading>

<process>
1. Read the existing `config.json`. If it doesn't exist, redirect to
   `workflows/first-run-setup.md` instead — there's nothing to add to yet.
2. Ask: institution/wallet name, is it an account or a wallet, ownership
   (personal/joint), owner(s) (must be existing `household.members` ids, or offer to add a
   new household member first if it's someone new).
3. For an account: resolve or ask for its Actual Budget account ID (via
   `actual-budget:query-budget` to list/search), whether it's on-budget, and
   `reconciliation_mode` (statement vs. bank_sync_only — if statement, correspondent/title
   pattern too, same as first-run-setup Step 5).
4. For a wallet: ask for the descriptor (external/internal or combined form). Compute all
   three forms (see `references/config-schema.md`'s `credentials_json` note on why all
   three are stored) and write them into `credentials.json` under `wallets.<id>` — never
   inline the descriptor in `config.json`, only a `credentials_ref` pointer.
5. Ask whether to set up a periodic sync job now — see `workflows/manage-periodic-jobs.md`.
6. Write the updated config via `scripts/write_config.py` (temp → validate → atomic
   replace). Confirm what was added.
</process>

<success_criteria>
- New entry appended to `config.json`'s `accounts` or `wallets` array, existing entries
  untouched
- Any wallet descriptor lands only in `credentials.json`, never in `config.json` or
  `docs/finance/`
- Confirmation message states exactly what was added
</success_criteria>
