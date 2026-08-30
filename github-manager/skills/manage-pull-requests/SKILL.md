---
name: manage-pull-requests
description: Handles GitHub PR webhook events; auto-merges Dependabot patches, escalates external PRs via Telegram. Fires on payload.pull_request.
user-invocable: false
allowed-tools:
  - Bash
  - mcp__plugin_telegram_telegram__reply

---

<objective>
Handles GitHub PR webhook events: auto-merges Dependabot patches via the test → merge → rebase loop and escalates external PRs via Telegram.
</objective>

<quick_start>
On `payload.pull_request` with `action: opened`: route by sender against the plugin `CLAUDE.md` Trusted Principals — trusted bot actor (e.g. `dependabot[bot]`) → follow `<dependabot_opened>`; trusted human → `<trusted_human_opened>` informational Telegram; external → `<external_actor_opened>` escalation.
</quick_start>

<essential_principles>
**Managed repos and trusted principals**: Read from this plugin's `CLAUDE.md` (at the plugin root, one level above `skills/`). Verify the incoming repo is in the managed repos list before acting — ignore all others. Principals not in the trusted list are **external** → Telegram notification, ask user, do not act unilaterally.

**Tools**: `gh` CLI via Bash for GitHub ops · `mcp__plugin_telegram_telegram__reply` for notifications (use `chat_id` from session; if unavailable, log in response)
</essential_principles>

<dependabot_opened>
**Trusted bot actor (per the plugin `CLAUDE.md` Trusted Principals), `action: opened`:**

→ Read and follow `workflows/handle-dependabot-pr.md` exactly.

Key principles:
- **One PR at a time.** Never process multiple Dependabot PRs in parallel.
- **Test before merge.** For repos with a live service, build → start → verify logs → merge.
- **Use docker compose.** When a `compose.yml` exists, always use `docker compose` commands
  (not `docker run`) to stop/rebuild/start the service.
- **Handle rebase before continuing.** After merging, wait for remaining PRs to rebase
  (auto or manual) before processing the next one.
</dependabot_opened>

<trusted_human_opened>
**Trusted human (per the plugin `CLAUDE.md` Trusted Principals), `action: opened`:**

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

<workflows_index>
| Workflow | Purpose |
|----------|---------|
| handle-dependabot-pr.md | Full test→merge→rebase loop for Dependabot PRs (build, docker compose, verify logs, merge, fix conflicts) |
</workflows_index>

<success_criteria>
- Dependabot patch merged only after passing the smoke-test loop
- External PRs escalated with a review/approve/close/ignore question
- `closed` / `synchronize` / `labeled` produced no action
</success_criteria>
