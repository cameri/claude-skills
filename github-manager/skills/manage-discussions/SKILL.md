---
name: manage-discussions
description: Handles GitHub discussion webhook events; silently monitors trusted users, escalates external discussions via Telegram. Fires on payload.discussion.
user-invocable: false
allowed-tools:
  - mcp__plugin_telegram_telegram__reply
---

<essential_principles>
**Managed repos and trusted principals**: Read from this plugin's `CLAUDE.md` (at the plugin root, one level above `skills/`). Verify the incoming repo is in the managed repos list before acting — ignore all others. Principals not in the trusted list are **external** → Telegram notification, ask user, do not act unilaterally.

**Tools**: `mcp__plugin_telegram_telegram__reply` for notifications (use `chat_id` from session; if unavailable, log in response)
</essential_principles>

<trusted_actor>
**Trusted actor, `action: created`:** No action (monitor only).
</trusted_actor>

<external_actor>
**External actor, `action: created`:**

```
🟡 [github-manager] New discussion from external user
Repo: {repo}
Author: @{sender}
Category: {category}
Title: {title}
{url}

Reply, close, or ignore?
```
</external_actor>
