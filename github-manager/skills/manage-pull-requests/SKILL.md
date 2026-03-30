---
name: manage-pull-requests
description: Handles GitHub PR webhook events; auto-merges Dependabot patches, escalates external PRs via Telegram. Fires on payload.pull_request.
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

<dependabot_opened>
**`dependabot[bot]`, `action: opened`:**

1. Parse update type:
   - Branch matches `dependabot/*/major` or title contains "major" → **major**
   - Otherwise → **patch/minor**
2. **Patch/minor**: wait for CI (monitor `check_suite` events for the PR's head SHA). Once `conclusion: success`:
   ```bash
   gh pr review {number} --repo {owner}/{repo} --approve
   gh pr merge {number} --repo {owner}/{repo} --squash --delete-branch
   ```
3. **Major**: send Telegram notification:
   ```
   🟡 [github-manager] Dependabot major update
   Repo: {repo}
   PR: {title}
   {url}

   Merge, close, or ignore?
   ```
</dependabot_opened>

<trusted_human_opened>
**Trusted human (`cameri` or `phoenix-server`), `action: opened`:**

Send Telegram notification (informational — no action):
```
🟢 [github-manager] New PR opened
Repo: {repo}
Author: @{sender}
Title: {title}
{url}
```
</trusted_human_opened>

<external_actor_opened>
**External actor, `action: opened`:**

```
🟡 [github-manager] New PR from external user
Repo: {repo}
Author: @{sender}
Title: {title}
{url}

What should I do? (review/approve/close/ignore)
```
</external_actor_opened>

<other_actions>
**Any actor, `action: closed`** (merged: true): No action.
**Any actor, `action: synchronize` / `labeled`:** No action.
</other_actions>
