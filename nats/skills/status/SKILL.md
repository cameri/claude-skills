---
name: status
description: Show the current status of the Claude Code NATS agent — connection info, NATS URL, and all discovered agents with their capabilities. Use when the user says "nats status", "show nats agents", "what agents are connected", or wants to see the agent network state.
user-invocable: true
allowed-tools:
  - Read
  - Bash(cat *)
  - Bash(ls *)
---

# /nats:status — NATS Agent Status

Shows the connection state of the local NATS agent and all known agents from
the local cache. The NATS MCP server is managed automatically by Claude Code
via the channel feature — no manual start/stop needed.

Arguments passed: `$ARGUMENTS`

---

## Steps

### 1. Configuration

Read `~/.claude/channels/nats/.env` if it exists. Show:
- `NATS_URL`: value or "(not configured — using defaults: nats://nats:4222, nats://nats-server:4222)"

### 2. This agent's ID

Read `~/.claude/skills/nats/agent-id` if it exists. Show the agent ID,
or "(not yet assigned — the channel server assigns one on first run)".

### 3. MCP server and connection

Use the `get_agents` MCP tool to check whether the NATS MCP server is
connected. If the tool call succeeds, the server is running and NATS is
reachable. If it fails, note that the channel may not be active — the user
can restart Claude Code with `--channels plugin:nats@claude-skills`.

### 4. Discovered agents

Display the result of `get_agents`. For each agent:
- Agent ID
- Name
- Last seen (ISO timestamp)
- Capabilities (type + name + description)

Format as a structured list. If the cache is empty, suggest running
`/nats:discover` to scan the network.

### 5. Hint

Agent cache is at `~/.claude/channels/nats/agents.json`.
Run `/nats:discover` for a live scan of all connected agents.
