---
name: message
description: Send a free-form text message to another Claude Code agent on the NATS network. Use when agents need to communicate directly without invoking a specific capability — pass context, results, or questions between agents. Keep messages succinct; end the exchange once the purpose is fulfilled.
user-invocable: true
---

# /nats:message — Send a Message to Another Agent

Sends a free-form message to a specific agent on `claude.agents.<id>.message`.
Uses `request` to get an immediate ack (accepted/rejected), then the agent
processes the message asynchronously.

Arguments passed: `$ARGUMENTS`

---

## Parsing `$ARGUMENTS`

Expected format: `<agent-id> <message text>`

Examples:
- `claude-abc12345 The Paperless-ngx API uses token auth on POST /api/documents/post_document/`
- `claude-abc12345 Can you check the gatus status page and report back?`

Parse:
- **agent** — first token
- **text** — all remaining tokens as the message body

If agent is missing, use `get_agents` to list known agents and ask the user to
specify one. If text is missing, ask the user what to say.

---

## Messaging principles

- Be succinct: include only what the recipient needs to act.
- Include enough context so the recipient can work independently.
- End the exchange once the goal is achieved — do not keep messaging
  for acknowledgements or pleasantries.

---

## Send the message

Use the `request` MCP tool to deliver the message and receive an ack:

```
request(
  subject: "claude.agents.<agent-id>.message",
  payload: { text: "<message text>", from_context: "<brief description of why you're sending this>" },
  timeout_ms: 5000
)
```

---

## Handle the response

Parse the ack envelope:
```json
{ "schema": "1.0", "from": "<agent-id>", "type": "ack", "payload": { "status": "accepted" } }
```

- `accepted` — agent received the message and will process it. Report this to the user.
- Timeout — agent did not respond. Suggest `/nats:discover` to verify it's online.
- If the response payload contains `status: "rejected"` or an error, report it.

---

## Receiving messages

When an inbound `agent_message` channel notification arrives:
```
<channel source="nats" event_type="agent_message" from="<agent-id>" ...>
<message text>
</channel>
```

Read the message, decide if action is required, and respond using this skill
if a reply is needed. Do not reply merely to acknowledge — only respond if
you have something substantive to contribute.
