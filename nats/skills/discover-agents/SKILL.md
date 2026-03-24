---
name: discover-agents
description: Discover all Claude Code agents on the NATS network and list their capabilities. Use when the user says "discover agents", "who's on nats", "list nats agents", "find agents", or wants to see what agents are available.
user-invocable: true
---

<objective>
Sends a discovery ping on `claude.discovery.ping` and collects pong responses for 3 seconds. All responding agents are listed with their capabilities. Results are cached to `~/.claude/channels/nats/agents.json`.
</objective>

<quick_start>
`/nats:discover-agents`

Pass a custom timeout for slow networks: `/nats:discover-agents timeout=5000`
</quick_start>

<workflow>
Use the `discover` MCP tool (exposed by the NATS channel server):

```
discover(timeout_ms?: number)
```

Default timeout is 3000ms. Pass a larger value if the network is slow.

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
> No agents discovered. Make sure other Claude Code instances are running with the NATS channel enabled and connected to the same NATS server.
</workflow>

<notes>
The local agent is always included in the cache (it self-registers on startup) but won't appear in discover results unless another agent responds to the ping — the local agent does not respond to its own ping.
</notes>

<success_criteria>
- Discovery ping sent and response window collected
- All responding agents listed with their capabilities
- Cache updated at `~/.claude/channels/nats/agents.json`
- Zero-response case explained with troubleshooting guidance
</success_criteria>
