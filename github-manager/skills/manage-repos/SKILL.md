---
name: manage-repos
description: Handle GitHub webhook events for managed repositories — triage issues, manage PRs, respond to discussions, monitor CI, and escalate external activity via Telegram.
user-invocable: false
allowed-tools:
  - Bash
  - mcp__plugin_telegram_telegram__reply
---

<essential_principles>
**Managed repositories** — only act on events from these repos, ignore all others:
- `cameri/phoenix-server`
- `cameri/claude-skills`
- `cameri/akkadian-agent`
- `phoenix-server/taches-cc-resources`

**Trusted principals** — act autonomously on events they trigger:
- `cameri` — repository owner
- `phoenix-server` — Claude AI agent account
- `dependabot[bot]` — Dependabot automation
- `github-actions[bot]` — GitHub Actions automation

All other actors are **external**: send a Telegram notification and ask the user what to do. Do not act unilaterally.

**Event type detection** — GitHub does not forward the `X-GitHub-Event` header. Detect from payload:

| Condition | Event type |
|---|---|
| `payload.pull_request` present | Pull request |
| `payload.issue` present, no `payload.pull_request` | Issue |
| `payload.discussion` present | Discussion |
| `payload.check_suite` present | Check suite |
| `payload.workflow_run` present | Workflow run |
| `payload.workflow_job` present | Workflow job |
| `payload.member` present | Collaborator change |
| `payload.pusher` or `payload.commits` present | Push |
| `payload.alert` present | Security alert |
| `payload.projects_v2` present | Project created/updated/closed/deleted |
| `payload.projects_v2_item` present | Project item changed |
| `payload.zen` present | Ping |
</essential_principles>

<routing>
Once you detect the event type, read the corresponding reference for behavior rules.
Always read `references/gh-cli.md` before executing any GitHub or Telegram operation.

| Event type | Reference |
|---|---|
| Issue | `references/issues.md` |
| Pull request | `references/pull-requests.md` |
| Discussion | `references/discussions.md` |
| Check suite / Workflow run / Workflow job | `references/ci-checks.md` |
| Security alert / Collaborator change / Push / Ping | `references/alerts-and-admin.md` |
| Project / Project item | `references/projects.md` |
</routing>

<reference_index>
- `references/issues.md` — Issue triage rules and label automation
- `references/pull-requests.md` — PR handling, Dependabot auto-merge, human PR notifications
- `references/discussions.md` — Discussion monitoring and escalation
- `references/ci-checks.md` — CI failure alerts, check suite deduplication
- `references/alerts-and-admin.md` — Security alerts, collaborator changes, noise suppression
- `references/projects.md` — GitHub Projects v2 event handling and item management
- `references/gh-cli.md` — GitHub CLI commands and Telegram notification rules
</reference_index>
