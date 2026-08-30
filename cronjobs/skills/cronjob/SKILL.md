---
name: cronjob
description: Schedule recurring or one-time jobs. TRIGGER when user says "schedule X", "remind me every Y", "run X once in Y", or "/cronjobs:cronjob". When a job fires as a channel notification, execute it.
user-invocable: true
allowed-tools:
  - Agent
  - mcp__plugin_cronjobs_cronjobs__add-job
  - mcp__plugin_cronjobs_cronjobs__list-jobs
  - mcp__plugin_cronjobs_cronjobs__remove-job
  - mcp__plugin_cronjobs_cronjobs__clear-jobs
---

<objective>
Creates, lists, and removes scheduled jobs using natural language timing expressions. When a scheduled job fires, a channel notification arrives — execute the described task.
</objective>

<quick_start>
```
/cronjobs:cronjob check email every 1 hour
/cronjobs:cronjob send daily standup summary every weekday at 9am
/cronjobs:cronjob remind me to drink water once in 30 minutes
/cronjobs:cronjob              → list active jobs
/cronjobs:cronjob remove <id>  → cancel a job
```
</quick_start>

<argument_parsing>
Parse `$ARGUMENTS` to extract:
- **task**: what to do when the job fires (everything before the schedule expression)
- **expression**: the schedule timing (the last phrase — "every N units", "once in N units", etc.)

If `$ARGUMENTS` is empty or contains "list": list active jobs.
If `$ARGUMENTS` contains "remove", "cancel", or "delete" and an ID: remove that job.
If `$ARGUMENTS` is "clear all": clear all jobs.
</argument_parsing>

<workflow>
**Adding a job:**

1. Extract task and expression from `$ARGUMENTS`. If ambiguous, ask the user.
2. Call `add-job` with the task and expression.
3. Confirm: "Scheduled **{task}** to run {expression} (ID: `{id}`, next run: {nextRun})."

**Listing jobs:**

Call `list-jobs`. Show a table: ID | Task | Expression | Type | Next Run.
If empty, say "No active jobs."

**Removing a job:**

Call `remove-job` with the ID. Confirm removal.

**Error handling:**

If `add-job` returns an error (e.g. unsupported expression), report the error and offer the supported forms in `<supported_expressions>`.
If `remove-job` reports an unknown ID, say so and show `list-jobs` output.

**When a channel notification fires:**

A notification arrives with:
```json
{
  "source": "cronjobs",
  "schedule_id": "abc12345",
  "task": "check email",
  "type": "cron" | "once",
  "fired_at": "2026-03-22T09:00:00.000Z"
}
```

Dispatch the task to a subagent rather than executing it inline — this keeps the interactive session (and whatever pane/channel exchange is live in it) free while the job runs. Call `Agent` with the task text as the prompt, verbatim plus the `schedule_id`/`fired_at` for context — the subagent starts with no memory of this conversation, so the prompt must be fully self-contained (it already should be, since these tasks are written to survive a fresh agent with no prior context). Omit `subagent_type` (defaults to general-purpose, which has full tool access) unless the task names a more specific agent. Do not block on the dispatch beyond kicking it off; the subagent reports via its own completion notification. After dispatching, do NOT reply to the notification yourself — the subagent, not this turn, is responsible for any results it needs to report.
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
| `every day at 9am` | Daily at 09:00 server-local time |
| `every weekday at 3am` | Mon–Fri at 03:00 server-local time |
| `every weekend at noon` | Sat+Sun at 12:00 server-local time |
| `every monday at 10:30am` | Every Monday at 10:30 server-local time |
| `every friday` | Every Friday at midnight server-local time |
| `0 9 * * 1-5` | Raw 5-field cron expression, also server-local time |

All times, including raw 5-field cron expressions, resolve in the server process's local timezone (`TZ` env var, falling back to the host's timezone) — not UTC. If the user specifies a different timezone, convert to server-local time before scheduling, and say what you converted it to when confirming the job.
</supported_expressions>

<success_criteria>
- Job created and confirmed with ID and next run time
- List shows all active jobs in a clear table
- Scheduled tasks executed when channel notification fires
- Removal confirmed with job ID
</success_criteria>
