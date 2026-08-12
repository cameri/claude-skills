<overview>
Two files, both under `~/.claude/channels/finance-manager/` — never in the plugin directory,
never in `docs/finance/` (that's a git repo pushed to a remote; `~/.claude/channels/` never
is). Both written via `scripts/write_config.py` (temp file in the same directory → parse
back and diff-check → `os.replace` atomic rename). `credentials.json` is `chmod 600`;
`config.json` is `chmod 644` (no secrets in it, just structure/IDs).
</overview>

<config_json>
`~/.claude/channels/finance-manager/config.json` — structure and status, no secrets.

```json
{
  "household": {
    "members": [
      {"id": "alex", "name": "Alex Example"},
      {"id": "jamie", "name": "Jamie Example"}
    ]
  },
  "connections": {
    "actual_budget": {"connected": true},
    "paperless": {"connected": true, "markitdown_configured": true}
  },
  "reporting": {
    "telegram_chat_id": null
  },
  "accounts": [
    {
      "id": "joint-checking",
      "name": "Joint Checking Account",
      "actual_budget_id": "00000000-0000-0000-0000-000000000001",
      "institution": "Example Bank",
      "ownership": "joint",
      "owners": ["alex", "jamie"],
      "on_budget": true,
      "reconciliation_mode": "statement",
      "paperless_correspondent_id": 354,
      "paperless_title_pattern": "Joint Account Statement-XXXX",
      "sync_job_id": null
    }
  ],
  "wallets": [
    {
      "id": "hot-wallet",
      "name": "Hot Wallet",
      "kind": "hot",
      "ownership": "personal",
      "owners": ["alex"],
      "actual_budget_id": "00000000-0000-0000-0000-000000000002",
      "credentials_ref": "wallets.hot-wallet",
      "sync_job_id": "a1b2c3d4"
    }
  ]
}
```

Field notes:
- `reporting.telegram_chat_id`: where headless/cron-triggered skills (reconciliation
  reports, periodic sync jobs) send their output. `null` until the user provides one during
  setup; skills that need to report headlessly should ask for it once and write it back via
  `scripts/write_config.py` rather than assuming any particular chat.
- `reconciliation_mode`: `"statement"` (paperless + MarkItDown extraction feeds
  `reconcile-statement`), `"bank_sync_only"` (Actual Budget's own SimpleFin/bank-sync is
  the only source — no paperless workflow needed), or `"manual_csv"` (no paperless
  correspondent and no live bank-sync connector exists for this institution — e.g. a crypto
  exchange, or a custodial loan account — backfilled from manually-obtained CSV/statement
  exports instead).
- `paperless_correspondent_id` / `paperless_title_pattern`: only present when
  `reconciliation_mode` is `"statement"`. Same fields `account-map.md` used to hold.
- `sync_job_id`: the `cronjobs` plugin job ID if a periodic sync exists for this
  account/wallet, else `null`.
- `credentials_ref` (wallets only): dotted path into `credentials.json` where the
  descriptor(s) live. Never inline the descriptor here.
</config_json>

<credentials_json>
`~/.claude/channels/finance-manager/credentials.json` — wallet descriptors only (for now).
Nothing else currently needs plugin-specific secrets beyond what `actual-budget:access` /
`paperless:access` already store in their own channel directories.

```json
{
  "wallets": {
    "hot-wallet": {
      "name": "Hot Wallet",
      "kind": "hot",
      "descriptor_external": "wsh(sortedmulti(2,[fp/84'/0'/0']xpub.../0/*,...))",
      "descriptor_internal": "wsh(sortedmulti(2,[fp/84'/0'/0']xpub.../1/*,...))",
      "descriptor_combined": "wsh(sortedmulti(2,[fp/84'/0'/0']xpub.../<0;1>/*,...))",
      "received_via": "telegram",
      "received_date": "2026-07-22"
    }
  }
}
```

`descriptor_combined` is what `query-mempool descriptor` consumes directly. Keep
`descriptor_external`/`descriptor_internal` too since that's how wallets typically export
them, and re-deriving the combined form from two separately-shaped strings is error-prone —
store all three once, computed carefully at entry time.
</credentials_json>

<migration_from_account_map>
`docs/finance/account-map.md` predates this config and has real hand-curated data
(correspondent → account mappings, reconciliation notes). `first-run-setup.md` offers to
import each of its table rows as a candidate account entry — the user confirms
ownership/reconciliation-mode per row rather than re-entering institution/account-ID data
that's already correct. After import, `account-map.md` gets a header note marking it
superseded-but-kept (audit trail), not deleted. `reconcile-statement`'s workflow and
`manage-paperless-workflows` read from `config.json` afterward instead.
</migration_from_account_map>
