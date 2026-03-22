---
name: schedule
description: Schedule a task using natural language — "every 3 minutes", "every weekday at 9am", "once in 5 minutes". Use when the user says "schedule X", "remind me to X every Y", "run X once in Y", "/schedule", or wants a recurring or one-time task trigger. When a scheduled task fires, a channel notification arrives — execute the task described in it.
user-invocable: true
allowed-tools:
  - mcp__plugin_scheduler_scheduler__add_schedule
  - mcp__plugin_scheduler_scheduler__list_schedules
  - mcp__plugin_scheduler_scheduler__remove_schedule
  - mcp__plugin_scheduler_scheduler__clear_schedules
---

## Usage

Arguments passed: `$ARGUMENTS`

Parse `$ARGUMENTS` to extract:
- **task**: what to do when the schedule fires (everything before the schedule expression)
- **expression**: the schedule timing (the last phrase — "every N units", "once in N units", etc.)

Examples:
```
/schedule check email every 1 hour
  → task="check email", expression="every 1 hour"

/schedule send daily standup summary every weekday at 9am
  → task="send daily standup summary", expression="every weekday at 9am"

/schedule remind me to drink water once in 30 minutes
  → task="remind me to drink water", expression="once in 30 minutes"

/schedule
  → list active schedules
```

## Workflow

### Adding a schedule

1. Extract task and expression from `$ARGUMENTS`. If ambiguous, ask the user.
2. Call `add_schedule` with the task and expression.
3. Confirm: "Scheduled **{task}** to run {expression} (ID: `{id}`, next run: {nextRun})."

### Listing schedules

If `$ARGUMENTS` is empty or contains "list":
- Call `list_schedules`.
- Show a table: ID | Task | Expression | Type | Next Run.
- If empty, say "No active schedules."

### Removing a schedule

If `$ARGUMENTS` contains "remove", "cancel", or "delete" and an ID:
- Call `remove_schedule` with the ID.

If `$ARGUMENTS` is "clear all":
- Call `clear_schedules`.

### When a channel notification fires

A notification arrives with:
```json
{
  "source": "scheduler",
  "schedule_id": "abc12345",
  "task": "check email",
  "type": "cron" | "once",
  "fired_at": "2026-03-22T09:00:00.000Z"
}
```

Execute the task described. For example, if task is "check email", check the user's email. After completing the task, do NOT reply to the notification — just perform the work silently unless you need to report results.

## Supported expressions

| Phrase | Meaning |
|---|---|
| `once in 5 minutes` | Fires once after 5 minutes |
| `in 2 hours` | Fires once after 2 hours |
| `every minute` | Every minute |
| `every 3 minutes` | Every 3 minutes |
| `every hour` | Top of every hour |
| `every 2 hours` | Every 2 hours |
| `every day at 9am` | Daily at 09:00 UTC |
| `every weekday at 3am` | Mon–Fri at 03:00 UTC |
| `every weekend at noon` | Sat+Sun at 12:00 UTC |
| `every monday at 10:30am` | Every Monday at 10:30 UTC |
| `every friday` | Every Friday at midnight UTC |
| `0 9 * * 1-5` | Raw 5-field cron expression |

All times are UTC. If the user specifies a timezone, note it and convert to UTC before scheduling.
