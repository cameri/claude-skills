---
name: discover
description: Discover all Claude Code agents on the NATS network and list their capabilities. Use when the user says "discover agents", "who's on nats", "list nats agents", "find agents", or wants to see what agents are available.
user-invocable: true
---

# /nats:discover — Discover NATS Agents

Sends a discovery ping on `claude.discovery.ping` and collects pong responses
for 3 seconds. All responding agents are listed with their capabilities.
Results are cached to `~/.claude/channels/nats/agents.json`.

Arguments passed: `$ARGUMENTS`

---

## Steps

Use the `discover` MCP tool (exposed by the NATS channel server):

```
discover(timeout_ms?: number)
```

Default timeout is 3000ms. Pass a larger value if the network is slow.

---

## Display results

For each discovered agent:
```
Agent: <agentId>
  Name: <name>
  Last seen: <lastSeen>
  Capabilities (<count>):
    - [<type>] <name>: <description>
    ...
```

If no agents responded:
> No agents discovered. Make sure other Claude Code instances are running
> with the NATS channel enabled and connected to the same NATS server.

Note that the local agent is always included in the cache (it self-registers
on startup) but won't appear in discover results unless another agent responds
to the ping — the local agent does not respond to its own ping.
