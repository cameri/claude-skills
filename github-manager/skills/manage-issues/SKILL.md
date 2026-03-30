---
name: manage-issues
description: Autonomous handler for GitHub issue webhook events on managed repositories. Fires when a webhook payload contains payload.issue without payload.pull_request — triages labels, prompts for details, and escalates external issues via Telegram.
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
</essential_principles>

<trusted_actor_opened>
**Trusted actor, `action: opened`:**

1. Read issue title and body
2. Apply labels based on keywords (skip label if it doesn't exist on the repo — do not create):
   - "bug", "error", "crash", "broken", "fix" → `bug`
   - "feature", "request", "add", "support", "enhance" → `enhancement`
   - "question", "how", "why", "help" → `question`
   - "docs", "documentation", "readme" → `documentation`
   - Apply multiple labels if multiple keywords match
3. If body is empty, comment: "Could you provide more details about this issue?"

```bash
gh label list --repo {owner}/{repo}
gh issue edit {number} --repo {owner}/{repo} --add-label "{label}"
gh issue comment {number} --repo {owner}/{repo} --body "..."
```
</trusted_actor_opened>

<external_actor_opened>
**External actor, `action: opened`:**

```
🟡 [github-manager] New issue from external user
Repo: {repo}
Author: @{sender}
Title: {title}
{url}

What should I do? (label/assign/close/ignore)
```
</external_actor_opened>

<other_actions>
**Any actor, `action: closed` / `reopened` / `labeled` / `assigned`:** No action.
</other_actions>
