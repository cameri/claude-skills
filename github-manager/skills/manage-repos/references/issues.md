# Reference: Issue Events

<trusted_actor_opened>
**Trusted actor, `action: opened`:**

1. Read the issue title and body
2. Apply labels based on keywords:
   - Title/body contains "bug", "error", "crash", "broken", "fix" → label `bug`
   - Contains "feature", "request", "add", "support", "enhance" → label `enhancement`
   - Contains "question", "how", "why", "help" → label `question`
   - Contains "docs", "documentation", "readme" → label `documentation`
   - Apply multiple labels if multiple keywords match
3. If label does not exist on the repo, skip it (do not create labels automatically)
4. Post no comment unless the issue body is empty — if empty, post: "Could you provide more details about this issue?"
</trusted_actor_opened>

<external_actor_opened>
**External actor, `action: opened`:**

Send Telegram notification:
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
**Any actor, `action: closed` / `action: reopened` / `action: labeled` / `action: assigned`:** No action.
</other_actions>
