---
name: status
description: Show the current status of the Claude Code NATS agent — connection info, PID, NATS URL, and all discovered agents with their capabilities. Use when the user says "nats status", "show nats agents", "what agents are connected", or wants to see the agent network state.
user-invocable: true
allowed-tools:
  - Read
  - Bash(cat *)
  - Bash(kill *)
  - Bash(ls *)
---

# /nats:status — NATS Agent Status

Shows the running state of the local NATS agent and all known agents discovered
from the network cache.

Arguments passed: `$ARGUMENTS`

---

## Steps

### 1. Server process

Read `/tmp/nats-agent.pid`:
- If missing: report "Agent: not running"
- If present: check `kill -0 <PID> 2>/dev/null`
  - Running: report "Agent: running (PID: `<pid>`)"
  - Stale: report "Agent: not running (stale PID file)"

### 2. Configuration

Read `~/.claude/channels/nats/.env` if it exists. Show:
- `NATS_URL`: value or "(not configured — using defaults: nats://nats:4222, nats://nats-server:4222)"

### 3. This agent's ID

Read `~/.claude/skills/nats/agent-id` if it exists. Show the agent ID,
or "(not yet assigned — start the agent first)".

### 4. Discovered agents

Read `/tmp/nats-agents.json` if it exists. For each agent, display:
- Agent ID
- Name
- Last seen (ISO timestamp)
- Capabilities list (type + name + description)

Format as a clean table or structured list. If the cache is empty or missing,
show "No agents discovered yet — run `/nats:discover` to scan the network."

### 5. Logs

Mention that agent logs are at `/tmp/nats-agent.log`.
Suggest `cat /tmp/nats-agent.log | tail -20` to view recent activity.
