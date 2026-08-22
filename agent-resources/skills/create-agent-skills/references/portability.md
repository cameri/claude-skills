<overview>
Skills must work across different users, repos, and environments without modification. Hardcoding project-specific values into a skill ties it to one context and silently breaks it everywhere else.

A related but distinct failure: a skill authored inside one maintainer's real environment can end up embedding *that maintainer's* personal or organizational identity — not just an environment-specific value that breaks elsewhere, but one that actively identifies who built it, where they work, or who they know. This matters most for a skill meant to ship publicly (a shared plugin, marketplace listing, or open-source repo): non-portable values are a functionality bug, but personal/sensitive values are a privacy leak. Treat both checks as required, not just the portability one.
</overview>

<what_portability_means>
A portable skill contains zero project-specific values. It reads context at runtime and falls back gracefully when context is missing.

**Non-portable (hardcoded):**
```
Repo: your-org/your-service
Local path: /workspace/projects/your-service/
Service: your-service
Health signal: "Nest application successfully started"
Trusted users: alice, bob
```

**Portable (runtime discovery):**
```
Read the plugin's CLAUDE.md to find managed repos, local paths, and service metadata.
Discover compose files with: find . -name "compose.yml" -o -name "docker-compose.yml"
Discover service names from compose file keys.
```
</what_portability_means>

<portability_rules>
**Rule 1: No hardcoded paths outside the skill directory**
Never write absolute paths to repos, workspaces, or tools (`/workspace/projects/...`, `/home/user/...`). These paths are environment-specific. If a workflow needs to `cd` into a repo, the path must come from CLAUDE.md or be inferred from the webhook payload.

**Rule 2: No hardcoded repo names or usernames**
`your-org/your-service`, `bob`, `dependabot[bot]` are project-specific. Put them in the plugin's CLAUDE.md and have the skill read from there.

**Rule 3: No hardcoded service names or health signals**
Container names, health check strings, and port numbers belong in a CLAUDE.md or in a structured metadata file. A skill that only knows how to health-check one service is useless for any other.

**Rule 4: No hardcoded environment assumptions**
Don't assume the Docker builder is legacy. Don't assume `pnpm` is the package manager. Discover these from the project's files (`Dockerfile`, `package.json`, `pnpm-lock.yaml`, `yarn.lock`).
</portability_rules>

<sensitive_and_osint_rules>
These are not "non-portable" in the ordinary sense (a working example that only fits one environment) — they actively expose who built the skill or who they know, even in a private repo that later goes public or gets forked. Scrub them regardless of whether the skill is ever meant to be portable:

**Rule 5: No real personal names, handles, or first-name references**
An example, a comment, or a "for X's workflow" note that names an actual person (maintainer, coworker, family member) by name or handle identifies them even out of context. Use a role or placeholder instead ("the user", "a teammate", "alice"/"bob" as clearly-fictional stand-ins).

**Rule 6: No real contact info or account identifiers**
Email addresses, phone numbers, physical addresses, Telegram/Discord/Slack chat IDs or user IDs, social handles, bank/wallet/account numbers — these identify a real person or let someone find them, regardless of whether the skill "needs" a real value to demonstrate the pattern. Use an obviously-fake placeholder (an RFC 5737 documentation IP, `user@example.com`, a round fake ID like `000000`).

**Rule 7: No real infrastructure identifiers**
Internal IP addresses, real domain names for private services, real Cloudflare/Tailscale/VPN hostnames, real webhook paths or API keys — these are OSINT breadcrumbs that can help someone map a real deployment. Generic placeholders or a pointer to a private, gitignored config file (see `where_specific_values_go` below) both work; a real value never belongs in tracked skill content.

**Rule 8: When in doubt, genericize and ask**
If a skill was bulk-copied or adapted from a real working setup (a fork of your own tooling, an example lifted from a live session), assume it carries real identity until checked — that is exactly how leaks happen (a real username/repo/path baked into an example is a documented recurrence in this plugin's own history). Scan for the maintainer's own name, org, domains, and account IDs specifically, not just generic "does this look like a path." If a value's necessity or sensitivity is unclear, ask the user before publishing rather than guessing either way.
</sensitive_and_osint_rules>

<where_specific_values_go>
Project-specific values belong in one of two places:

**Plugin's CLAUDE.md** — for values that Claude needs to act on autonomously:
```markdown
## Managed Repos
| Repo | Local path | Compose service | Health signal |
|------|-----------|-----------------|---------------|
| your-org/your-service | /workspace/projects/your-service | your-service | "Nest application successfully started" |

## Trusted Principals
- alice
- bob
- dependabot[bot]
- github-actions[bot]
```

**Plugin's README.md** — for values a human needs to configure the plugin (non-critical to operation).

Skills reference CLAUDE.md at runtime. When a skill says "check the repo_map in CLAUDE.md", Claude reads the current CLAUDE.md and uses whatever is there — no skill edits required when adding a new repo.
</where_specific_values_go>

<runtime_discovery_patterns>
**Discover repos and local paths:**
```
Read the plugin's CLAUDE.md → look for a table or list of managed repos with local paths.
```

**Discover if a repo has a compose file:**
```bash
ls {local_path}/compose.yml {local_path}/docker-compose.yml 2>/dev/null
```

**Discover compose service names:**
```bash
docker compose -f {compose_file} config --services
```

**Discover package manager:**
```bash
ls {local_path}/pnpm-lock.yaml  # → pnpm
ls {local_path}/yarn.lock       # → yarn
ls {local_path}/package-lock.json  # → npm
```

**Discover Dockerfile build constraints:**
```bash
grep -c 'mount=type=cache' {local_path}/Dockerfile
```
</runtime_discovery_patterns>

<skill_vs_configuration_boundary>
| Belongs in skill | Belongs in CLAUDE.md |
|-----------------|---------------------|
| HOW to check out a PR | WHICH repos are managed |
| HOW to build a Docker image | WHERE repos live locally |
| HOW to detect a compose file | WHAT the health signal is |
| HOW to run health checks | WHO the trusted principals are |
| HOW to merge a PR | WHAT service name to use |
</skill_vs_configuration_boundary>

<portability_checklist>
Before finalizing a skill, verify:
- [ ] No absolute file paths in skill files (outside skill directory itself)
- [ ] No specific repo names, usernames, or org names
- [ ] No specific service names, container names, or port numbers
- [ ] No specific health check strings or log patterns
- [ ] Project-specific values documented in CLAUDE.md
- [ ] Skill reads CLAUDE.md (or equivalent) at runtime for project-specific values
- [ ] Discovery commands used where values can be inferred from filesystem
- [ ] No real personal names, handles, emails, phone numbers, or physical addresses
- [ ] No real chat/user/account IDs, tokens, or secrets
- [ ] No real internal IPs, private domains, or webhook paths
- [ ] If adapted from a real working setup, actively scanned for the maintainer's own identity — not just checked for obvious placeholders
</portability_checklist>
