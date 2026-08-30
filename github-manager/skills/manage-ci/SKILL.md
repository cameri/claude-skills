---
name: manage-ci
description: Handles GitHub CI webhook events; alerts on failures via Telegram. Fires on payload.check_suite, workflow_run, or workflow_job.
user-invocable: false
allowed-tools:
  - mcp__plugin_telegram_telegram__reply

---

<objective>
Alerts on GitHub CI failures via Telegram, deduplicated across the check_suite / workflow_run / workflow_job event trio.
</objective>

<quick_start>
Only act on `check_suite` events (see `<check_suite>`): `conclusion: failure` → send the alert template; skip `workflow_run` / `workflow_job` (see `<workflow_events>`) to avoid duplicate notifications.
</quick_start>

<essential_principles>
**Managed repos**: Read from this plugin's `CLAUDE.md` (at the plugin root, one level above `skills/`). Verify the incoming repo is in the managed repos list before acting — ignore all others.

**Tools**: `mcp__plugin_telegram_telegram__reply` for notifications (use `chat_id` from session; if unavailable, log in response)

**Deduplication**: If you already sent a Telegram notification for this check suite (same `check_suite.id`), skip. Only act on `check_suite` events — workflow_run and workflow_job fire alongside them and would cause duplicates.
</essential_principles>

<check_suite>
**`check_suite`, `conclusion: failure`:**

```
🔴 [github-manager] CI failed
Repo: {repo}
Branch: {branch}
Commit: {short_sha} — {commit_message_first_line}
{html_url}
```

**`check_suite`, `conclusion: success` or any other:** No action.
</check_suite>

<workflow_events>
**`workflow_run` / `workflow_job`:** Skip — handled via `check_suite` to avoid duplicate notifications.
</workflow_events>

<success_criteria>
- One Telegram notification per failed check suite (deduplicated by `check_suite.id`)
- Zero duplicate notifications; successes and other conclusions silent
</success_criteria>
