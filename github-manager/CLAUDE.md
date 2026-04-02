# github-manager Plugin Configuration

This file is the authoritative source for project-specific values used by the github-manager skills.
Update this file when adding, removing, or changing repos, services, or access control — skills read from here at runtime.

## Managed Repos

Skills only act on repos in this table. Events for any other repo are silently ignored.

| Repo | Local path | Compose file | Service name | Health signal |
|------|-----------|--------------|--------------|---------------|
| `cameri/akkadian-agent` | `/workspace/projects/akkadian-agent/` | `compose.yml` | `akkadian-agent` | `"Nest application successfully started"` |

Repos with no live service (no build/test needed — merge directly after CI passes):
- `cameri/claude-skills`
- `cameri/phoenix-server`
- `phoenix-server/taches-cc-resources`

## Trusted Principals

Act autonomously for events from these actors. All others are **external** → Telegram notification, ask user, do not act unilaterally.

- `cameri`
- `phoenix-server`
- `dependabot[bot]`
- `github-actions[bot]`
