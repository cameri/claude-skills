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

- **decrypt-failure / missing-key**: the `ACTUAL_DATA_DIR` cache is stale. Delete the budget subdirectory inside it and let the CLI re-download.
  ```bash
  rm -rf "$ACTUAL_DATA_DIR"/My-Finances-*
  node "$ACTUAL" accounts list --format json
  ```
- **sync-id not found**: ensure `ACTUAL_SYNC_ID` is the groupId (`5207407b-d8c9-49b6-b60d-bc4b7e4b12a6`), not the cloudFileId.
- **Lock timeout**: another CLI process is running. Wait or use `--no-lock` with care.
