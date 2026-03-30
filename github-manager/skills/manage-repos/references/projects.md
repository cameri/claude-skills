# Reference: GitHub Projects Events

<event_detection>
GitHub Projects v2 sends two event types. Detect from payload:

| Condition | Event type |
|---|---|
| `payload.projects_v2` present | Project created/updated/closed/deleted |
| `payload.projects_v2_item` present | Item added/edited/archived/deleted in a project |
</event_detection>

<projects_v2_events>
**`projects_v2`, `action: created`** (trusted actor):
Send Telegram notification (informational):
```
🟢 [github-manager] New project created
Owner: {projects_v2.owner.login}
Title: {projects_v2.title}
{projects_v2.html_url}
```

**`projects_v2`, `action: closed` or `action: deleted`** (trusted actor):
Send Telegram notification (informational):
```
🟡 [github-manager] Project {action}
Owner: {projects_v2.owner.login}
Title: {projects_v2.title}
```

**`projects_v2`, any action** (external actor):
```
🟡 [github-manager] Project {action} by external user
Owner: {projects_v2.owner.login}
Title: {projects_v2.title}
Actor: @{sender}

What should I do?
```

**`projects_v2`, `action: updated`:** No action (too noisy).
</projects_v2_events>

<projects_v2_item_events>
**`projects_v2_item`, `action: created`** (trusted actor): No action (items are added frequently; too noisy).

**`projects_v2_item`, `action: deleted` or `action: archived`** (trusted actor): No action.

**`projects_v2_item`, any action** (external actor):
```
🟡 [github-manager] Project item {action} by external user
Project: {projects_v2_item.project_node_id}
Actor: @{sender}

What should I do?
```
</projects_v2_item_events>

<adding_items_to_projects>
When handling new issues or PRs from trusted actors, you may also add them to the relevant project:

```bash
# Add an issue or PR to a project by URL
gh project item-add {project_number} --owner {owner} --url {issue_or_pr_url}

# List projects to find the right project number
gh project list --owner {owner}
```

Only add items to projects when you know the target project number. Do not guess — if uncertain, skip this step.
</adding_items_to_projects>
