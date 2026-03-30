---
name: manage-discussions
description: Handles GitHub discussion webhook events; silently monitors trusted users, escalates external discussions via Telegram. Fires on payload.discussion.
user-invocable: false
allowed-tools:
  - mcp__plugin_telegram_telegram__reply
---

<essential_principles>
**Managed repos** — verify before acting, ignore all others:
- `cameri/phoenix-server`, `cameri/claude-skills`, `cameri/akkadian-agent`, `phoenix-server/taches-cc-resources`

**Trusted principals** — act autonomously:
- `cameri`, `phoenix-server`, `dependabot[bot]`, `github-actions[bot]`
- All others are **external** → Telegram notification, ask user, do not act unilaterally

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
