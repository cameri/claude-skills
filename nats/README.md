# nats

Claude Code plugin for connecting Claude instances as discoverable agents over
[NATS](https://nats.io). Runs as an MCP channel server — Claude Code manages
the lifecycle automatically. Agents announce themselves on startup, can
message each other point-to-point, ping for liveness, and discover who else
is on the network.

This exists for agent-to-agent messaging that Claude Code's own built-in
cross-session messaging can't reach — in particular, across different
Anthropic accounts (it does not cross that boundary) or across separate
hosts that both reach the same NATS server.

## Quick start

```
/nats:access NATS_URL=nats://my-server:4222
```

Then restart Claude Code with the channel flag:

```sh
claude --dangerously-load-development-channels plugin:nats@claude-skills
```

> **Note:** `--dangerously-load-development-channels` requires interactive
> approval the first time you run it. Once channels are generally available,
> switch back to `--channels` instead.

The NATS agent server starts automatically. Run `/nats:discover` to see who's
on the network.

## Skills

| Skill | Command | Description |
|---|---|---|
| access | `/nats:access` | Save the NATS server URL and this agent's display name, test connectivity |
| show-nats-status | `/nats:show-nats-status` | Show agent status, NATS URL, display name, and known agents |
| discover-agents | `/nats:discover-agents` | Broadcast "who's there?" and list all discovered agents |
| ping-agent | `/nats:ping-agent` | Liveness check against one known agent, reports round-trip time |
| send-message | `/nats:send-message` | Send a free-form message directly to another agent |

## MCP tools

The channel server exposes these tools directly to Claude:

| Tool | Description |
|---|---|
| `message(to, text)` | Send a free-form message to another agent by ID |
| `ping(to, timeout_ms?)` | Liveness check against one known agent |
| `discover(timeout_ms?)` | Broadcast "who's there?", collect responses from every agent |
| `get_agents()` | Return known agents from local cache |

## Subject pattern

```
claude.agents.<agent-id>.inbox   # direct message delivery
claude.agents.<agent-id>.ping    # liveness check (request/reply)
claude.discovery.announce        # agent announces on join
claude.discovery.ping            # "who's there?" broadcast (all agents reply)
claude.discovery.pong            # discovery pong responses
```

## Message schema

All messages use a common JSON envelope:

```json
{
  "schema": "1.0",
  "from": "<agent-id>",
  "fromName": "<friendly name>",
  "inbox": "claude.agents.<agent-id>.inbox",
  "ts": "<ISO timestamp>",
  "type": "message | ping | pong | announce",
  "payload": {}
}
```

`inbox` is always the sender's own inbox subject — reply there directly.

## Configuration

Stored in `~/.claude/channels/nats/.env` (chmod 600):

| Key | Description | Default |
|---|---|---|
| `NATS_URL` | Full NATS server URL | `nats://nats:4222` |
| `NATS_AGENT_NAME` | Friendly display name for this agent | this session's `/rename` name, else the agent ID |

If `NATS_URL` isn't configured, the server tries `nats://nats:4222` then
`nats://nats-server:4222` automatically. `NATS_AGENT_NAME` is read once at
server startup; the `/rename` fallback is re-read live on every message, so
renaming the Claude Code session takes effect without restarting the channel.

## Agent identity

Each agent gets a stable ID generated once and persisted to
`~/.claude/skills/nats/agent-id`. The ID survives restarts. The display name
resolves fresh each time: `NATS_AGENT_NAME` if set, else this Claude Code
session's own name (set via `/rename`), else the bare agent ID.
Agent cache is stored at `~/.claude/channels/nats/agents.json`.

## Install

```
/plugin install nats@claude-skills
/reload-plugins
```

## License

MIT
