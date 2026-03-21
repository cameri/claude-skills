# actual-budget

Claude Code plugin for interacting with a self-hosted [Actual Budget](https://actualbudget.org/) instance.

## Skills

| Skill | Command | Description |
|---|---|---|
| configure | `/actual-budget:configure` | Save server URL and password, test connection |
| budget | `/actual-budget:budget` | List accounts, balances, transactions, and budget vs actual |
| add-transaction | `/actual-budget:add-transaction` | Log a transaction in natural language |

## Credentials

Stored in `~/.claude/channels/actual-budget/.env` (chmod 600):

| Key | Description |
|---|---|
| `SERVER_URL` | Base URL of your Actual Budget server (no trailing slash) |
| `PASSWORD` | Server password (set in Actual Budget settings) |

## License

Apache-2.0
