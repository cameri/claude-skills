# Reference: GitHub CLI & Notifications

<gh_commands>
Use `gh` CLI (via `Bash`) for all GitHub operations:

| Operation | Command |
|---|---|
| View issue | `gh issue view {number} --repo {owner}/{repo}` |
| Add issue comment | `gh issue comment {number} --repo {owner}/{repo} --body "..."` |
| Edit issue labels | `gh issue edit {number} --repo {owner}/{repo} --add-label "..."` |
| List labels | `gh label list --repo {owner}/{repo}` |
| View PR | `gh pr view {number} --repo {owner}/{repo}` |
| Approve PR | `gh pr review {number} --repo {owner}/{repo} --approve` |
| Merge PR (squash) | `gh pr merge {number} --repo {owner}/{repo} --squash --delete-branch` |
| Close PR | `gh pr close {number} --repo {owner}/{repo}` |
</gh_commands>

<telegram_notifications>
Send notifications using `mcp__plugin_telegram_telegram__reply`. Use the chat ID from prior Telegram context in the session. If no chat ID is available, skip the notification and log it as a comment in your response.
</telegram_notifications>
