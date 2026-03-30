---
name: manage-projects
description: Handles GitHub Projects v2 webhook events; notifies on lifecycle changes, escalates external activity via Telegram. Fires on payload.projects_v2 or projects_v2_item.
user-invocable: false
allowed-tools:
  - Bash
  - mcp__plugin_telegram_telegram__reply
---

<essential_principles>
**Managed repos** — verify before acting, ignore all others:
- `cameri/phoenix-server`, `cameri/claude-skills`, `cameri/akkadian-agent`, `phoenix-server/taches-cc-resources`

**Trusted principals** — act autonomously:
- `cameri`, `phoenix-server`, `dependabot[bot]`, `github-actions[bot]`
- All others are **external** → Telegram notification, ask user, do not act unilaterally

**Tools**: `gh` CLI via Bash for GitHub ops · `mcp__plugin_telegram_telegram__reply` for notifications (use `chat_id` from session; if unavailable, log in response)

**Note**: `gh project` requires the `project` OAuth scope (`gh auth refresh -s project -h github.com`).
</essential_principles>

<projects_v2_events>
**`projects_v2`, `action: created`** (trusted actor):
```
🟢 [github-manager] New project created
Owner: {projects_v2.owner.login}
Title: {projects_v2.title}
{projects_v2.html_url}
```

**`projects_v2`, `action: closed` or `action: deleted`** (trusted actor):
```
🟡 [github-manager] Project {action}
Owner: {projects_v2.owner.login}
Title: {projects_v2.title}
```

**`projects_v2`, `action: updated`:** No action (too noisy).

**`projects_v2`, any action** (external actor):
```
🟡 [github-manager] Project {action} by external user
Owner: {projects_v2.owner.login}
Title: {projects_v2.title}
Actor: @{sender}

What should I do?
```
</projects_v2_events>

<projects_v2_item_events>
**`projects_v2_item`, `action: created` / `archived` / `deleted`** (trusted actor): No action.

**`projects_v2_item`, any action** (external actor):
```
🟡 [github-manager] Project item {action} by external user
Project: {projects_v2_item.project_node_id}
Actor: @{sender}

What should I do?
```
</projects_v2_item_events>

<adding_items>
To add a new issue or PR to a project when handling other events:
```bash
gh project list --owner {owner}
gh project item-add {project_number} --owner {owner} --url {issue_or_pr_url}
```
Only add when you know the target project number. If uncertain, skip.
</adding_items>
