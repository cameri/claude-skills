---
name: configure-nats
description: Configure the NATS server URL for Claude Code agent communication. Use when the user wants to set up NATS, change the NATS server URL, check current connection settings, or says "configure nats".
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash(mkdir *)
  - Bash(chmod *)
  - Bash(ls *)
  - Bash(cat *)
  - Bash(grep *)
  - Bash(nats *)
---

<objective>
Manages the NATS server URL for the Claude Code agent. The URL is stored in `~/.claude/channels/nats/${ENV}.env` (chmod 600) and used by the NATS MCP server to connect to the agent network.
</objective>

<quick_start>
Save URL: `/nats:configure-nats NATS_URL=nats://nats:4222`

Check status: `/nats:configure-nats` (no args)

Guided setup: `/nats:configure-nats setup`
</quick_start>

<context>
The `env=<name>` argument selects a named environment (e.g. `env=prod`). Omit for the default environment. When `ENV` is empty, the path resolves to `~/.claude/channels/nats/.env`. Display empty ENV as "(default)" in output; omit `env=` from suggested commands.

Credential key: `NATS_URL` — full NATS server URL (e.g. `nats://nats:4222`)
</context>

<workflow>
Parse `env=<name>` from `$ARGUMENTS` first. Strip it from remaining arguments before dispatch.

**No arguments — status check:**

1. Check if `~/.claude/channels/nats/${ENV}.env` exists.
2. If not: report no configuration for this environment and suggest:
   - `/nats:configure-nats NATS_URL=nats://nats:4222`
   - `/nats:configure-nats setup`
3. If yes: load the file, show `NATS_URL`, then test connectivity:
   ```bash
   nats --server "$NATS_URL" server ping 2>&1 | head -5
   ```
   If `nats` CLI is not available, report the URL and note that connection test requires the `nats` CLI tool.
4. List all available environments by showing files in `~/.claude/channels/nats/` matching `*.env`, stripping the `.env` suffix. Display `.env` as "(default)".

**`setup` — guided setup:**

1. Explain: "The NATS_URL points to your NATS server. Common values:"
   - `nats://nats:4222` (Docker service named `nats`)
   - `nats://nats-server:4222` (Docker service named `nats-server`)
   - `nats://localhost:4222` (local NATS server)
2. Ask the user for the NATS server URL (default: `nats://nats:4222`).
3. Save and test (same as explicit save below).

**`NATS_URL=<value>` — save the URL:**

Parse `NATS_URL` from `$ARGUMENTS`. Accept both `NATS_URL=...` and `url=...` (case-insensitive).

1. `mkdir -p ~/.claude/channels/nats`
2. Write:
   ```bash
   cat > ~/.claude/channels/nats/${ENV}.env <<'EOF'
   NATS_URL=<value>
   EOF
   chmod 600 ~/.claude/channels/nats/${ENV}.env
   ```
3. Test connectivity with `nats --server "$NATS_URL" server ping 2>&1 | head -5`.
4. Report result.

**`clear` — remove all credentials for this environment:**

Delete `~/.claude/channels/nats/${ENV}.env` and confirm.

**`clear NATS_URL` — remove the key:**

Remove the `NATS_URL` line from `${ENV}.env`.
</workflow>

<notes>
If no URL is configured, the agent server defaults to trying:
1. `nats://nats:4222`
2. `nats://nats-server:4222`

These match common Docker Compose service names.
</notes>

<success_criteria>
- NATS URL saved to env file with `chmod 600`
- Connectivity test passes (`server ping` succeeds)
- Status output shows current URL and all available environments
- Missing env file = not configured, reported clearly with next steps
</success_criteria>
