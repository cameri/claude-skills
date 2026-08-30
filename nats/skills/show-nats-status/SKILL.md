---
name: show-nats-status
description: Show the current status of the Claude Code NATS agent — connection info, NATS URL, display name, and all discovered agents. Use when the user says "nats status", "show nats agents", "what agents are connected", or wants to see the agent network state.
user-invocable: true
allowed-tools:
  - Read
  - Bash(cat *)
  - Bash(ls *)
---

<objective>
Shows the connection state of the local NATS agent and all known agents from the local cache. The NATS MCP server is managed automatically by Claude Code via the channel feature — no manual start/stop needed.
</objective>

<quick_start>
`/nats:show-nats-status`
</quick_start>

<workflow>
**1. Configuration:**

Read `~/.claude/channels/nats/.env` if it exists. Show:
- `NATS_URL`: value or "(not configured — using the default URLs documented in the access skill)"

**2. This agent's identity:**

Read `~/.claude/skills/nats/agent-id` if it exists. Show the agent ID, or "(not yet assigned — the channel server assigns one on first run)".

Show the display name too: `NATS_AGENT_NAME` from the env file if set, otherwise the Claude Code session name (shown in the MCP server's startup instructions), otherwise the bare agent ID.

**3. MCP server and connection:**

Use the `get_agents` MCP tool to check whether the NATS MCP server is connected. If the tool call succeeds, the server is running and NATS is reachable. If it fails, note that the channel may not be active — the user can restart Claude Code with `--channels plugin:nats@claude-skills`.

**4. Discovered agents:**

Display the result of `get_agents`. For each agent:
- Agent ID
- Name
- Last seen (ISO timestamp)

Format as a structured list. If the cache is empty, suggest running `/nats:discover-agents` to scan the network.

**5. Hint:**

Agent cache is at `~/.claude/channels/nats/agents.json`.
Run `/nats:discover-agents` for a live scan of all connected agents.
</workflow>

<success_criteria>
- NATS URL and agent ID displayed (or clear not-configured messages)
- Agent list from cache shown
- MCP server connectivity confirmed or failure explained
- User knows next step (discover if cache empty, reconfigure if URL missing)
</success_criteria>
