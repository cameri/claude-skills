---
name: ping-agent
description: Send a liveness check to a specific Claude agent on the NATS network and report round-trip time. Use when the user says "ping <agent>", "is <agent> online", or wants to check whether a known agent is responsive.
user-invocable: true
---

<objective>
Sends a direct liveness check to one known agent using the `ping` MCP tool and reports whether it responded, and how fast.
</objective>

<quick_start>
Arguments format: `<agent-id> [timeout_ms]`

Examples:
- `claude-abc12345`
- `claude-abc12345 timeout=10000`
</quick_start>

<argument_parsing>
Expected format: `<agent-id> [timeout=<ms>]`

Parse:
- **agent** — first token
- **timeout** — optional `timeout=<ms>` (default: 5000)

If agent is missing, use `get_agents` to list known agents and ask the user which one.
</argument_parsing>

<workflow>
```
ping(to: "<agent-id>", timeout_ms: <timeout>)
```

On success, report the responding agent's name and round-trip time in ms:
> `<name>` (`<agent-id>`) responded in `<rttMs>`ms.

On timeout, report that the agent did not respond within the window and suggest `/nats:discover-agents` to check who's actually online.
</workflow>

<success_criteria>
- Ping sent to the correct agent
- Round-trip time reported on success
- Timeout case handled with actionable guidance
</success_criteria>
