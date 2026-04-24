# cronjobs

Schedule jobs using natural language. The plugin runs as a background MCP channel server and fires Claude channel notifications when jobs are due.

## Skills

| Skill | Description |
|---|---|
| `cronjob` | Add, list, and remove cron jobs |

## Example usage

```
/cronjob check email every 1 hour
/cronjob send daily standup summary every weekday at 9am
/cronjob remind me to drink water once in 30 minutes
/cronjob list
/cronjob remove abc12345
```

## Supported schedule expressions

| Expression | Meaning |
|---|---|
| `once in 5 minutes` | One-time, fires after a delay |
| `every 3 minutes` | Recurring interval |
| `every hour` | Top of every hour |
| `every day at 9am` | Daily at 09:00 UTC |
| `every weekday at 3am` | Mon–Fri at 03:00 UTC |
| `every monday at 10:30am` | Specific weekday + time |
| `every weekend at noon` | Sat+Sun at noon UTC |
| `0 9 * * 1-5` | Raw 5-field cron expression |

All times are UTC.

## Install

```
/plugin install cronjobs@claude-skills
/reload-plugins
```

Then start Claude with the channel flag:

```sh
claude --dangerously-load-development-channels plugin:cronjobs@claude-skills
```

> **Note:** `--dangerously-load-development-channels` requires interactive approval the first time. Once channels are generally available, use `--channels` instead.

## State

Jobs persist across restarts in `~/.claude/channels/cronjobs/jobs.json`.

## License

MIT
