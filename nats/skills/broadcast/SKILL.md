---
name: broadcast
description: Broadcast a capability invocation to all Claude Code agents on the NATS network and collect their responses. Use when the user says "broadcast to agents", "ask all agents to", "send to all agents", or wants to invoke a capability on every agent simultaneously.
user-invocable: true
---

# /nats:broadcast — Broadcast a Capability to All Agents

Publishes a request on `claude.agents.broadcast.<capability>` and collects
responses from all agents within a time window (default: 5 seconds).

Arguments passed: `$ARGUMENTS`

---

## Parsing `$ARGUMENTS`

Expected format: `<capability> [JSON payload]`

Examples:
- `nats:status`
- `capabilities`
- `invoke {"capability":"nats:discover"}`

Parse:
- **capability** — first token
- **payload** — remaining text as JSON (default: `{}`)

If capability is missing, list common options and ask the user to specify one.

---

## Send broadcast

Use the `broadcast` MCP tool:

```
broadcast(
  capability: "<capability>",
  payload: <parsed-payload>,
  timeout_ms: 5000
)
```

---

## Display results

The tool returns a JSON map `{ "<agent-id>": <payload>, ... }` of all agents
that responded within the window.

For each responding agent:
```
Agent <agent-id>:
  ✓ <result summary>  (or ✗ <error>)
```

Summary line:
> Broadcast `<capability>` — `<count>` agent(s) responded.

If no agents responded:
> No agents responded. Verify other agents are connected with `/nats:discover`.
