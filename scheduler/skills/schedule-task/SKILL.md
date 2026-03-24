---
name: schedule-task
description: Schedule a task using natural language — "every 3 minutes", "every weekday at 9am", "once in 5 minutes". Use when the user says "schedule X", "remind me to X every Y", "run X once in Y", "/schedule", or wants a recurring or one-time task trigger. When a scheduled task fires, a channel notification arrives — execute the task described in it.
user-invocable: true
allowed-tools:
  - mcp__plugin_scheduler_scheduler__add_schedule
  - mcp__plugin_scheduler_scheduler__list_schedules
  - mcp__plugin_scheduler_scheduler__remove_schedule
  - mcp__plugin_scheduler_scheduler__clear_schedules
---

<objective>
Creates, lists, and removes scheduled tasks using natural language timing expressions. When a scheduled task fires, a channel notification arrives — execute the described task.
</objective>

<quick_start>
```
/schedule-task check email every 1 hour
/schedule-task send daily standup summary every weekday at 9am
/schedule-task remind me to drink water once in 30 minutes
/schedule-task              → list active schedules
/schedule-task remove <id>  → cancel a schedule
```
</quick_start>

<argument_parsing>
Parse `$ARGUMENTS` to extract:
- **task**: what to do when the schedule fires (everything before the schedule expression)
- **expression**: the schedule timing (the last phrase — "every N units", "once in N units", etc.)

If `$ARGUMENTS` is empty or contains "list": list active schedules.
If `$ARGUMENTS` contains "remove", "cancel", or "delete" and an ID: remove that schedule.
If `$ARGUMENTS` is "clear all": clear all schedules.
</argument_parsing>

<workflow>
**Adding a schedule:**

1. Extract task and expression from `$ARGUMENTS`. If ambiguous, ask the user.
2. Call `add_schedule` with the task and expression.
3. Confirm: "Scheduled **{task}** to run {expression} (ID: `{id}`, next run: {nextRun})."

**Listing schedules:**

Call `list_schedules`. Show a table: ID | Task | Expression | Type | Next Run.
If empty, say "No active schedules."

**Removing a schedule:**

Call `remove_schedule` with the ID. Confirm removal.

If `$ARGUMENTS` is "clear all": call `clear_schedules`.

**When a channel notification fires:**

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

Execute the task described. After completing, do NOT reply to the notification — perform the work silently unless you need to report results.
</workflow>

<supported_expressions>
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
</supported_expressions>

<success_criteria>
- Schedule created and confirmed with ID and next run time
- List shows all active schedules in a clear table
- Scheduled tasks executed when channel notification fires
- Removal confirmed with schedule ID
</success_criteria>
