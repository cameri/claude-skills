# nats

Claude Code plugin for connecting Claude instances as discoverable agents over
[NATS](https://nats.io). Agents register capabilities as NATS services, announce
themselves on startup, and can be invoked point-to-point or via broadcast.

## Skills

| Skill | Command | Description |
|---|---|---|
| configure | `/nats:configure` | Save the NATS server URL, test connectivity |
| start | `/nats:start` | Start the background NATS agent server |
| stop | `/nats:stop` | Stop the running NATS agent server |
| status | `/nats:status` | Show agent status, NATS URL, and known agents |
| discover | `/nats:discover` | Ping the network and list all discovered agents |
| call | `/nats:call` | Invoke a capability on a specific agent |
| broadcast | `/nats:broadcast` | Broadcast a capability call to all agents |

## Subject pattern

```
claude.agents.<agent-id>.capabilities     # query an agent's capabilities
claude.agents.<agent-id>.invoke.<cap>     # invoke a capability on a specific agent
claude.agents.broadcast.<cap>             # broadcast to all agents
claude.discovery.announce                 # agent announces on join
claude.discovery.ping                     # discovery ping (all agents reply)
claude.discovery.pong                     # discovery pong responses
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

Run `/nats:configure` to set up. If not configured, the agent server tries
`nats://nats:4222` then `nats://nats-server:4222` automatically.

## Agent identity

Each agent gets a stable ID generated once and persisted to
`~/.claude/skills/nats/agent-id`. This ID survives server restarts.

## Getting started

```
/nats:configure NATS_URL=nats://nats:4222
/nats:start
/nats:discover
```

## Install

```
/plugin install nats@claude-skills
/reload-plugins
```

## License

Apache-2.0
