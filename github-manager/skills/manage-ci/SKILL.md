---
name: manage-ci
description: Autonomous handler for GitHub CI and check suite webhook events on managed repositories. Fires when a webhook payload contains payload.check_suite, payload.workflow_run, or payload.workflow_job — alerts on CI failures via Telegram.
user-invocable: false
allowed-tools:
  - mcp__plugin_telegram_telegram__reply
---

<essential_principles>
**Managed repos** — verify before acting, ignore all others:
- `cameri/phoenix-server`, `cameri/claude-skills`, `cameri/akkadian-agent`, `phoenix-server/taches-cc-resources`

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
