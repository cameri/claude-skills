<overview>
Skills must work across different users, repos, and environments without modification. Hardcoding project-specific values into a skill ties it to one context and silently breaks it everywhere else.
</overview>

<what_portability_means>
A portable skill contains zero project-specific values. It reads context at runtime and falls back gracefully when context is missing.

**Non-portable (hardcoded):**
```
Repo: cameri/akkadian-agent
Local path: /workspace/projects/akkadian-agent/
Service: akkadian-agent
Health signal: "Nest application successfully started"
Trusted users: cameri, phoenix-server
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
`cameri/akkadian-agent`, `phoenix-server`, `dependabot[bot]` are project-specific. Put them in the plugin's CLAUDE.md and have the skill read from there.

**Rule 3: No hardcoded service names or health signals**
Container names, health check strings, and port numbers belong in a CLAUDE.md or in a structured metadata file. A skill that only knows how to health-check one service is useless for any other.

**Rule 4: No hardcoded environment assumptions**
Don't assume the Docker builder is legacy. Don't assume `pnpm` is the package manager. Discover these from the project's files (`Dockerfile`, `package.json`, `pnpm-lock.yaml`, `yarn.lock`).
</portability_rules>

<where_specific_values_go>
Project-specific values belong in one of two places:

**Plugin's CLAUDE.md** — for values that Claude needs to act on autonomously:
```markdown
## Managed Repos
| Repo | Local path | Compose service | Health signal |
|------|-----------|-----------------|---------------|
| cameri/akkadian-agent | /workspace/projects/akkadian-agent | akkadian-agent | "Nest application successfully started" |

## Trusted Principals
- cameri
- phoenix-server
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
</portability_checklist>
