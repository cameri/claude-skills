---
name: invoke-agent
description: Invoke a capability on a specific NATS agent by agent ID. Use when the user says "call <agent> <capability>", "invoke capability on agent", "ask agent X to do Y", or wants to send a point-to-point request to another agent.
user-invocable: true
---

<objective>
Sends a point-to-point request to a named agent on the NATS network and waits for a response. Uses the `claude.agents.<agent-id>.invoke.<capability>` subject pattern.
</objective>

<quick_start>
Arguments format: `<agent-id> <capability> [JSON payload]`

Examples:
- `claude-abc12345 nats:show-nats-status`
- `claude-abc12345 invoke {"capability":"nats:discover-agents"}`
- `claude-abc12345 capabilities`
</quick_start>

<argument_parsing>
Expected format: `<agent-id> <capability> [JSON payload]`

Parse:
- **agent** — first token
- **capability** — second token
- **payload** — remaining text as JSON (default: `{}`)

If agent or capability is missing, use `get_agents` to list known agents and ask the user to specify both.
</argument_parsing>

<workflow>
Use the `request` MCP tool:

```
request(
  subject: "claude.agents.<agent-id>.invoke.<capability>",
  payload: <parsed-payload>,
  timeout_ms: 10000
)
```

Special case: if `capability` is `capabilities`, use subject `claude.agents.<agent-id>.capabilities` instead.
</workflow>

<display_results>
Parse the response envelope:
```json
{ "schema": "1.0", "from": "<agent-id>", "ts": "...", "type": "response",
  "payload": { "success": true, "result": {...}, "error": null } }
```

- On success: display `payload.result` in a readable format.
- On error: display `payload.error`.
- On timeout: report that the agent did not respond within 10 seconds and suggest running `/nats:discover-agents` to verify the agent is online.
</display_results>

<success_criteria>
- Request sent to correct `invoke.<capability>` subject
- Response parsed and displayed clearly
- Timeout and error cases handled with actionable guidance
</success_criteria>
