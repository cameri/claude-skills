---
name: manage-admin
description: Handles GitHub security alerts, collaborator changes, pushes, and admin webhook events. Fires on payload.alert, payload.member, push, or ping.
user-invocable: false
allowed-tools:
  - mcp__plugin_telegram_telegram__reply
---

<essential_principles>
**Managed repos** — verify before acting, ignore all others:
- `cameri/phoenix-server`, `cameri/claude-skills`, `cameri/akkadian-agent`, `phoenix-server/taches-cc-resources`

**Tools**: `mcp__plugin_telegram_telegram__reply` for notifications (use `chat_id` from session; if unavailable, log in response)
</essential_principles>

<security_alerts>
**Security alert** (`payload.alert` present) — always notify regardless of sender:

```
🔒 [github-manager] Security alert
Repo: {repo}
Package: {alert.dependency.package.name}
Severity: {alert.rule.security_severity_level}
Advisory: {alert.rule.description}
{alert.html_url}
```
</security_alerts>

<collaborator_changes>
**Collaborator change** (`payload.member` present) — always notify (informational):

```
🟢 [github-manager] Collaborator change
Repo: {repo}
Action: {action} ({changes.role_name.to})
User: @{member.login}
```
</collaborator_changes>

<noise_events>
**Push events** (`payload.pusher` or `payload.commits` present): No action (too noisy).

**Ping events** (`payload.zen` present): No action.
</noise_events>
