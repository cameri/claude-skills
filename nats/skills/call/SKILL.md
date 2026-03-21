---
name: call
description: Invoke a capability on a specific NATS agent by agent ID. Use when the user says "call <agent> <capability>", "invoke capability on agent", "ask agent X to do Y", or wants to send a point-to-point request to another agent.
user-invocable: true
---

# /nats:call — Call a Capability on a Specific Agent

Sends a point-to-point request to a named agent and waits for a response.

Arguments passed: `$ARGUMENTS`

---

## Parsing `$ARGUMENTS`

Expected format: `<agent-id> <capability> [JSON payload]`

Examples:
- `claude-abc12345 nats:status`
- `claude-abc12345 invoke {"capability":"nats:discover"}`
- `claude-abc12345 capabilities`

Parse:
- **agent** — first token
- **capability** — second token
- **payload** — remaining text as JSON (default: `{}`)

If agent or capability is missing, use `get_agents` to list known agents and
ask the user to specify both.

---

## Send request

Use the `request` MCP tool:

```
request(
  subject: "claude.agents.<agent-id>.invoke.<capability>",
  payload: <parsed-payload>,
  timeout_ms: 10000
)
```

Special case: if `capability` is `capabilities`, use subject
`claude.agents.<agent-id>.capabilities` instead.

---

## Display results

Parse the response envelope:
```json
{ "schema": "1.0", "from": "<agent-id>", "ts": "...", "type": "response",
  "payload": { "success": true, "result": {...}, "error": null } }
```

- On success: display `payload.result` in a readable format.
- On error: display `payload.error`.
- On timeout: report that the agent did not respond within 10 seconds and
  suggest running `/nats:discover` to verify the agent is online.
