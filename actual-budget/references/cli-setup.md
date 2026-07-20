<cli_setup>
The `actual` CLI binary is installed at:

```
<base_dir>/../../../node_modules/.bin/actual
```

If `node_modules` is missing, install first:

```bash
npm install --prefix <base_dir>/../../..
```

Load credentials and export them for the CLI. Use `set -a` around the `source` so every variable the file defines (including `ACTUAL_DATA_DIR`, `ACTUAL_ENCRYPTION_PASSWORD`, or any key added later) is actually exported to the CLI subprocess — a plain `source` only sets shell variables, and the CLI won't see them:

```bash
set -a
source ~/.claude/channels/actual-budget/${ENV}.env
set +a
# Support both old (no prefix) and new (ACTUAL_ prefix) credential names
export ACTUAL_SERVER_URL="${ACTUAL_SERVER_URL:-$SERVER_URL}"
export ACTUAL_PASSWORD="${ACTUAL_PASSWORD:-$PASSWORD}"
export ACTUAL_SYNC_ID="${ACTUAL_SYNC_ID:-$SYNC_ID}"
export ACTUAL_DATA_DIR="${ACTUAL_DATA_DIR:-$DATA_DIR}"
export ACTUAL_ENCRYPTION_PASSWORD="${ACTUAL_ENCRYPTION_PASSWORD:-$ENCRYPTION_PASSWORD}"
ACTUAL="<base_dir>/../../../node_modules/.bin/actual"
```

## Troubleshooting

- **encrypt-failure / missing-key after a write command** (`transactions update`, `transactions add`, `rules create`, `rules delete`) on an E2E-encrypted budget — confirmed 2026-07-19: `ACTUAL_ENCRYPTION_PASSWORD` (env var or `--encryption-password` flag) is not honored by the generic sync-push path those commands use. The local write still applies — you'll often see `{"success": true}` in the output even though the process then prints `Error: We had an unknown problem opening "<budget>"` — but the change sits stuck in an unpushed queue, and every subsequent command fails at load time trying to flush that backlog first.
  - Fix: after **every single** mutating command, immediately flush with:
    ```bash
    $ACTUAL budgets download "$ACTUAL_SYNC_ID" --encryption-password "$ACTUAL_ENCRYPTION_PASSWORD"
    ```
  - Do this one write at a time. Batching several writes before flushing only applies the first one — every command after it fails to even open the budget until you flush.
</cli_setup>
