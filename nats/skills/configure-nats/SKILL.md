---
name: configure
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

# /nats:configure — Configure NATS Server URL

Manages the NATS server URL for the Claude Code agent. The URL is stored in
`~/.claude/channels/nats/${ENV}.env` (chmod 600).

Arguments passed: `$ARGUMENTS`

---

## Environment selection

Parse `env=<name>` from `$ARGUMENTS` before any other processing. Strip it from the
remaining arguments. Default to `""` (empty string) if not provided.

Credential file: `~/.claude/channels/nats/${ENV}.env`

When `ENV` is empty the path resolves to `~/.claude/channels/nats/.env` (the default).
When displaying the environment name, show "(default)" for an empty `ENV`.
When suggesting commands, omit the `env=` argument if `ENV` is empty.

---

## Credential keys

- `NATS_URL` — full NATS server URL (e.g. `nats://nats:4222` or `nats://my-server:4222`)

---

## Dispatch on `$ARGUMENTS` (after stripping `env=`)

### No arguments → status check

1. Check if `~/.claude/channels/nats/${ENV}.env` exists.
2. If not: report no configuration for this environment and suggest:
   - `/nats:configure NATS_URL=nats://nats:4222`
   - `/nats:configure setup`
3. If yes: load the file, show `NATS_URL`, then test connectivity:
   ```bash
   nats --server "$NATS_URL" server ping 2>&1 | head -5
   ```
   If `nats` CLI is not available, report the URL and note that connection
   test requires the `nats` CLI tool.
4. List all available environments by showing files in `~/.claude/channels/nats/`
   matching `*.env`, stripping the `.env` suffix. Display `.env` as "(default)".

### `setup` → guided setup

Walk the user through configuration interactively:

1. Explain: "The NATS_URL points to your NATS server. Common values:"
   - `nats://nats:4222` (Docker service named `nats`)
   - `nats://nats-server:4222` (Docker service named `nats-server`)
   - `nats://localhost:4222` (local NATS server)
2. Ask the user for the NATS server URL (default: `nats://nats:4222`).
3. Save and test (same as explicit save below).

### `NATS_URL=<value>` → save the URL

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

### `clear` → remove all credentials for this environment

Delete `~/.claude/channels/nats/${ENV}.env` and confirm.

### `clear NATS_URL` → remove the key

Remove the `NATS_URL` line from `${ENV}.env`.

---

## Default URLs

If no URL is configured, the agent server defaults to trying:
1. `nats://nats:4222`
2. `nats://nats-server:4222`

These match common Docker Compose service names.
