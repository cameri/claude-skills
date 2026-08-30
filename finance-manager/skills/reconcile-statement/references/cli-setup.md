**Bootstrap**

```bash
set -a
source ~/.claude/channels/actual-budget/.env
set +a
ACTUAL="$(command -v actual 2>/dev/null || echo '<actual-budget-plugin-dir>/node_modules/.bin/actual')"
```

**Environment variables (all set by .env)**

| Variable | Purpose |
|---|---|
| `ACTUAL_SERVER_URL` | ActualBudget server URL |
| `ACTUAL_PASSWORD` | Server login password |
| `ACTUAL_SYNC_ID` | Budget sync ID (groupId) |
| `ACTUAL_ENCRYPTION_PASSWORD` | E2E encryption password (same as server password) |
| `ACTUAL_DATA_DIR` | Local cache directory (per-user; set by the `.env` — never assume a specific home path) |

**Verify connection**

```bash
node "$ACTUAL" accounts list --format json 2>&1 | head -5
```

**Troubleshooting**

- **decrypt-failure / missing-key on initial load**: the `ACTUAL_DATA_DIR` cache is stale. Delete your budget's cache subdirectory inside it and let the CLI re-download.
  ```bash
  ls "$ACTUAL_DATA_DIR"                    # find your budget's cache dir name
  rm -rf "$ACTUAL_DATA_DIR"/<your-budget-name>-*
  node "$ACTUAL" accounts list --format json
  ```
- **encrypt-failure / missing-key after `transactions update` or `rules create` (write commands)** — confirmed 2026-07-19: for E2E-encrypted budgets, `ACTUAL_ENCRYPTION_PASSWORD` (whether as env var or `--encryption-password` flag) is **not** honored by the generic sync-push path that write commands use to flush their change up to the server. The local write itself still applies (you'll often see `{"success": true}` even though the process then prints an "unknown problem opening" error) — but the pending change sits stuck in an unpushed queue, and every subsequent command fails at load time trying (and failing) to flush that backlog first.
  - Fix: after **every single** mutating command (`transactions update`, `transactions add`, `rules create`, `rules delete`, etc.), immediately run `budgets download` with the explicit flag to force the key handshake and flush the queue, before doing anything else:
    ```bash
    node "$ACTUAL" budgets download "$ACTUAL_SYNC_ID" --encryption-password "$ACTUAL_ENCRYPTION_PASSWORD"
    ```
  - Do this one write at a time — batching multiple writes before flushing causes only the first to apply; every command after it fails to even open the budget until the queue is flushed.
  - This is a CLI limitation, not something to route around by skipping encryption or disabling the budget's E2E password.
- **sync-id not found**: ensure `ACTUAL_SYNC_ID` is set to the budget's groupId, not its cloudFileId — these are different identifiers in ActualBudget's sync protocol.
- **Lock timeout**: another CLI process is running. Wait or use `--no-lock` with care.
