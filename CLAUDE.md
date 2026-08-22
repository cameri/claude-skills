# cameri/skills

This is a public marketplace of Claude Code plugins — anything committed here is visible to anyone, including forks and clones made before a fix lands.

## Before committing

Scan new or modified content for personal and sensitive data before it lands in a commit, regardless of which plugin it's in:

- Real personal names, handles, or first-name references to a specific individual
- Emails, phone numbers, or physical addresses
- Chat IDs, user IDs, account numbers, tokens, or API keys
- Internal-only IP addresses, private domains, or webhook paths for infrastructure that isn't meant to be public

**Note on what's already public:** a commit's author username and email are already exposed via git history and GitHub regardless of what any tracked file says, so a skill mentioning them in passing isn't a new leak — the concern is content that adds exposure a reader couldn't already get elsewhere (a third party's name, a private service's address, a live credential). Likewise, a domain or service that's intentionally public-facing isn't a leak just for being named. Don't over-scrub either of these at the cost of readability; focus effort on what's actually private.

If a value's necessity or sensitivity is unclear, ask for explicit permission before committing rather than guessing either way.

See `agent-resources`'s `create-agent-skills` skill (`skills/create-agent-skills/references/portability.md`) for the fuller portability and sensitive-data checklist used when authoring or auditing a skill — it applies to every plugin in this repo, not just skills built with that plugin.
