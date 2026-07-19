# ActualBudget CLI Setup

## Bootstrap

```bash
set -a
source ~/.claude/channels/actual-budget/.env
set +a
ACTUAL="/workspace/projects/claude-skills/actual-budget/node_modules/.bin/actual"
```

## Environment variables (all set by .env)

| Variable | Purpose |
|---|---|
| `ACTUAL_SERVER_URL` | ActualBudget server URL |
| `ACTUAL_PASSWORD` | Server login password |
| `ACTUAL_SYNC_ID` | Budget sync ID (groupId) |
| `ACTUAL_ENCRYPTION_PASSWORD` | E2E encryption password (same as server password) |
| `ACTUAL_DATA_DIR` | Local cache directory (`/home/node/.actual-budget-data`) |

## Verify connection

```bash
node "$ACTUAL" accounts list --format json 2>&1 | head -5
```

## Troubleshooting

- **decrypt-failure / missing-key**: the `ACTUAL_DATA_DIR` cache is stale. Delete your budget's cache subdirectory inside it and let the CLI re-download.
  ```bash
  ls "$ACTUAL_DATA_DIR"                    # find your budget's cache dir name
  rm -rf "$ACTUAL_DATA_DIR"/<your-budget-name>-*
  node "$ACTUAL" accounts list --format json
  ```
- **sync-id not found**: ensure `ACTUAL_SYNC_ID` is set to the budget's groupId, not its cloudFileId — these are different identifiers in ActualBudget's sync protocol.
- **Lock timeout**: another CLI process is running. Wait or use `--no-lock` with care.
