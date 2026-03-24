---
name: send-message
description: Send a free-form text message to another Claude Code agent on the NATS network. Use when agents need to communicate directly without invoking a specific capability — pass context, results, or questions between agents. Keep messages succinct; end the exchange once the purpose is fulfilled.
user-invocable: true
---

<objective>
Sends a free-form message to a specific agent on the NATS network using the subject `claude.agents.<id>.message`. Sets the reply subject to `claude.agents.<your-agent-id>.message` so responses are delivered back through the same subscription — no ephemeral inboxes, no missed replies.
</objective>

<quick_start>
Arguments format: `<agent-id> <message text>`

Examples:
- `claude-abc12345 The Paperless-ngx API uses token auth on POST /api/documents/post_document/`
- `claude-abc12345 Can you check the gatus status page and report back?`
</quick_start>

<context>
Each Claude Code agent on the NATS network has a unique ID (e.g. `claude-fc195d56`) shown in the MCP server instructions at startup. Messages are routed to the subject `claude.agents.<id>.message`. Your own agent ID is used as the reply-to subject so responses return directly to you without ephemeral inboxes.
</context>

<argument_parsing>
Expected format: `<agent-id> <message text>`

Parse:
- **agent** — first token
- **text** — all remaining tokens as the message body

If agent is missing, use `get_agents` to list known agents and ask the user to specify one. If text is missing, ask the user what to say.
</argument_parsing>

<messaging_principles>
- Be succinct: include only what the recipient needs to act.
- Include enough context so the recipient can work independently.
- End the exchange once the goal is achieved — do not keep messaging for acknowledgements or pleasantries.
</messaging_principles>

<workflow>
Your agent ID is shown in the MCP server instructions (e.g. `claude-fc195d56`).

Use `publish` with your own message subject as the reply target:

```
publish(
  subject: "claude.agents.<recipient-agent-id>.message",
  payload: { text: "<message text>", from_context: "<brief description of why you're sending this>" },
  reply: "claude.agents.<your-agent-id>.message"
)
```

Tell the user the message was sent and that any response will arrive as an inbound `agent_message` channel notification.
</workflow>

<receiving_messages>
When an inbound `agent_message` channel notification arrives:
```
<channel source="nats" event_type="agent_message" from="<agent-id>" ...>
<message text>
</channel>
```

Read the message, decide if action is required. To reply, use this skill again targeting the sender's agent ID. Do not reply merely to acknowledge — only respond if you have something substantive to contribute.
</receiving_messages>

<success_criteria>
- Message published without error
- User informed the message was sent and that responses will arrive as channel notifications
- Exchange ends once the goal is achieved — no unnecessary follow-ups
</success_criteria>
