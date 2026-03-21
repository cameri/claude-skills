# nats

Claude Code plugin for connecting Claude instances as discoverable agents over
[NATS](https://nats.io). Runs as an MCP channel server — Claude Code manages
the lifecycle automatically. Agents announce themselves on startup and can be
invoked point-to-point or via broadcast.

## Quick start

```
/nats:configure NATS_URL=nats://my-server:4222
```

Then restart Claude Code with the channel flag:

```sh
claude --dangerously-load-development-channels plugin:nats@claude-skills
```

The NATS agent server starts automatically. Run `/nats:discover` to see who's
on the network.

## Skills

| Skill | Command | Description |
|---|---|---|
| configure | `/nats:configure` | Save the NATS server URL, test connectivity |
| status | `/nats:status` | Show agent status, NATS URL, and known agents |
| discover | `/nats:discover` | Ping the network and list all discovered agents |
| call | `/nats:call` | Invoke a capability on a specific agent |
| broadcast | `/nats:broadcast` | Broadcast a capability call to all agents |

## MCP tools

The channel server exposes these tools directly to Claude:

| Tool | Description |
|---|---|
| `publish(subject, payload)` | Fire-and-forget message to any subject |
| `request(subject, payload, timeout_ms?)` | Request/reply — waits for one response |
| `broadcast(capability, payload?, timeout_ms?)` | Invoke capability on all agents, collect responses |
| `discover(timeout_ms?)` | Ping all agents, return their capabilities |
| `get_agents()` | Return known agents from local cache |

## Subject pattern

```
claude.agents.<agent-id>.invoke.<cap>   # direct invocation (inbound)
claude.agents.broadcast.<cap>           # broadcast to all agents
claude.discovery.announce               # agent announces on join
claude.discovery.ping                   # discovery ping (all agents reply)
claude.discovery.pong                   # discovery pong responses
```

## Message schema

All messages use a common JSON envelope:

```json
{
  "schema": "1.0",
  "from": "<agent-id>",
  "ts": "<ISO timestamp>",
  "type": "request | response | announce | error",
  "payload": {}
}
```

## Configuration

NATS URL is stored in `~/.claude/channels/nats/.env` (chmod 600):

| Key | Description | Default |
|---|---|---|
| `NATS_URL` | Full NATS server URL | `nats://nats:4222` |

If not configured, the server tries `nats://nats:4222` then
`nats://nats-server:4222` automatically.

## Agent identity

Each agent gets a stable ID generated once and persisted to
`~/.claude/skills/nats/agent-id`. The ID survives restarts.
Agent cache is stored at `~/.claude/channels/nats/agents.json`.

## Install

```
/plugin install nats@claude-skills
/reload-plugins
```

## License

Apache-2.0
