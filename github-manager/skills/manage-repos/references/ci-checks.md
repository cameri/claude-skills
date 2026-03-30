# Reference: CI & Check Suite Events

<check_suite>
**Check Suite — `conclusion: failure`:**

Send Telegram notification:
```
🔴 [github-manager] CI failed
Repo: {repo}
Branch: {branch}
Commit: {short_sha} — {commit_message_first_line}
{html_url}
```

**Check Suite — `conclusion: success` or any other:** No action.

**Deduplication:** If you already sent a Telegram notification for this check suite (same `check_suite.id`), skip. Workflow run and workflow job events often fire alongside check suite — only act on `check_suite` to avoid duplicate notifications.
</check_suite>

<workflow_run_job>
**Workflow Run / Workflow Job:** Skip — handled via check suite event to avoid duplicate notifications.
</workflow_run_job>
