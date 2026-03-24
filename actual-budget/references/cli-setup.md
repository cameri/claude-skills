<cli_setup>
The `actual` CLI binary is installed at:

```
<base_dir>/../../../node_modules/.bin/actual
```

If `node_modules` is missing, install first:

```bash
npm install --prefix <base_dir>/../../..
```

Load credentials and export them for the CLI:

```bash
source ~/.claude/channels/actual-budget/${ENV}.env
# Support both old (no prefix) and new (ACTUAL_ prefix) credential names
export ACTUAL_SERVER_URL="${ACTUAL_SERVER_URL:-$SERVER_URL}"
export ACTUAL_PASSWORD="${ACTUAL_PASSWORD:-$PASSWORD}"
export ACTUAL_SYNC_ID="${ACTUAL_SYNC_ID:-$SYNC_ID}"
ACTUAL="<base_dir>/../../../node_modules/.bin/actual"
```
</cli_setup>
