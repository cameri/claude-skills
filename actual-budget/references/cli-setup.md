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
</cli_setup>
