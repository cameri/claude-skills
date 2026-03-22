# scheduler

Schedule tasks using natural language. The scheduler runs as a background MCP channel server and fires Claude channel notifications when tasks are due.

## Skills

| Skill | Description |
|---|---|
| `schedule` | Add, list, and remove scheduled tasks |

## Example usage

```
/schedule check email every 1 hour
/schedule send daily standup summary every weekday at 9am
/schedule remind me to drink water once in 30 minutes
/schedule list
/schedule remove abc12345
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
/plugin install scheduler@claude-skills
/reload-plugins
```

Then start Claude with the channel flag:

```sh
claude --dangerously-load-development-channels plugin:scheduler@claude-skills
```

> **Note:** `--dangerously-load-development-channels` requires interactive approval the first time. Once channels are generally available, use `--channels` instead.

## State

Schedules persist across restarts in `~/.claude/channels/scheduler/schedules.json`.

## License

Apache-2.0
