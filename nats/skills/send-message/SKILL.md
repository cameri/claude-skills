---
name: send-message
description: Send a free-form message to a specific Claude agent on the NATS network. Use to pass context, results, or questions between agents.
user-invocable: true
---

<objective>
Sends a free-form message to a specific agent on the NATS network using the `message` MCP tool. The recipient is told your agent ID and name so they can reply directly — no ephemeral inboxes, no missed replies.
</objective>

<quick_start>
Arguments format: `<agent-id> <message text>`

Examples:
- `claude-abc12345 Can you check the deployment status and report back?`
- `claude-abc12345 Here is the summary of today's sync — let me know if anything needs attention.`
</quick_start>

<context>
Each Claude Code agent on the NATS network has a stable ID (e.g. `claude-abc12345`) and a friendly display name, both shown in the MCP server instructions at startup. Messages are routed to the recipient's inbox subject, `claude.agents.<id>.inbox`.
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
```
message(to: "<recipient-agent-id>", text: "<message text>")
```

Tell the user the message was sent and that any response will arrive as an inbound `agent_message` channel notification.
</workflow>

<receiving_messages>
When an inbound `agent_message` channel notification arrives:
```
<channel source="nats" event_type="agent_message" from="<agent-id>" from_name="<name>" ...>
<message text>
</channel>
```

Read the message, decide if action is required. To reply, use this skill again targeting `from` (the sender's agent ID). Do not reply merely to acknowledge — only respond if you have something substantive to contribute.
</receiving_messages>

<success_criteria>
- Message sent without error
- User informed the message was sent and that responses will arrive as channel notifications
- Exchange ends once the goal is achieved — no unnecessary follow-ups
</success_criteria>
