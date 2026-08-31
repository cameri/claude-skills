# immune-system

Defensive security monitor for the agent instance. An always-on watcher
daemon fingerprints every skill, plugin, and hook install location (Claude
Code cache + user skills + hooks + settings.json hook registrations, omp
cache + skills) on an interval; anything new or changed becomes a finding and
the session is woken through a channel notification. The response protocol
evaluates findings like untrusted input (quarantined read-only subagent,
safety score 1–5), quarantines confirmed threats by moving them out of the
live tree, alerts the operator over Telegram with the evidence, and removes
only on explicit confirmation.

Runtime: Bun. MCP server (`server.ts`) + omp wake bridge
(`extensions/omp-channel.ts`).

## Skills

### `/immune-system:immune-response`

Use when a `source="immune-system"` channel notification arrives, when the
user asks to review a flagged skill/plugin/hook, or when a newly-installed
skill or hook seems malicious or compromised.

Protocol: get findings → classify (legit / red flag / ambiguous) → evaluate
suspicious entries in a quarantined read-only subagent (summary + safety
narrative + score 1–5) → score 5 clears with a recorded verdict, anything
below quarantines and alerts the operator → deletion only on confirmation.

## Installation

```
claude plugin marketplace add cameri-skills <url>
claude plugin install immune-system@cameri-skills
```

For omp:

```
omp plugin marketplace add cameri-skills <url>
omp plugin upgrade immune-system@cameri-skills
```

The always-on sweep starts with the MCP server; findings arrive as channel
notifications (`source="immune-system"`). State lives in
`~/.claude/channels/immune-system/`.

## License

Apache-2.0