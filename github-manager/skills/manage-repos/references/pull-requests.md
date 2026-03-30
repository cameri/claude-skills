# Reference: Pull Request Events

<dependabot_opened>
**`dependabot[bot]`, `action: opened`:**

1. Parse the update type from the PR branch name:
   - Branch matches `dependabot/*/major` or title contains "major" → **major** update
   - Otherwise → **patch/minor** update
2. For **patch/minor**: wait for CI to pass (monitor `check_suite` events for the PR's head SHA). Once a `check_suite` completes with `conclusion: success` for the same SHA:
   ```
   gh pr review {number} --repo {owner}/{repo} --approve
   gh pr merge {number} --repo {owner}/{repo} --squash --delete-branch
   ```
3. For **major**: send Telegram notification:
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

Send Telegram notification (informational only — no action):
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

Send Telegram notification:
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
**Any actor, `action: closed`** (with `merged: true`): No action.
**Any actor, `action: synchronize` / `action: labeled`:** No action.
</other_actions>
