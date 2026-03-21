---
name: call
description: Invoke a capability on a specific NATS agent by agent ID. Use when the user says "call <agent> <capability>", "invoke capability on agent", "ask agent X to do Y", or wants to send a point-to-point request to another agent.
user-invocable: true
allowed-tools:
  - Read
  - Bash(bun *)
  - Bash(cat *)
  - Bash(ls *)
  - Bash(grep *)
---

# /nats:call — Call a Capability on a Specific Agent

Sends a point-to-point request to a named agent on `claude.agents.<agent-id>.<capability>`
and waits for a response (timeout: 10 seconds).

Arguments passed: `$ARGUMENTS`

---

## Parsing `$ARGUMENTS`

Expected format: `<agent-id> <capability> [JSON payload]`

Examples:
- `claude-abc12345 nats:status`
- `claude-abc12345 invoke '{"capability":"nats:discover"}'`
- `claude-abc12345 capabilities`

Parse:
- **agent** — first token
- **capability** — second token
- **payload** — remaining text as JSON (default: `{}`)

If agent or capability is missing, check `/tmp/nats-agents.json` for known
agents and list them to help the user pick one. Then stop and ask for both.

---

## Prerequisites

Resolve NATS_URL:
```bash
NATS_URL=$(grep NATS_URL ~/.claude/channels/nats/.env 2>/dev/null | cut -d= -f2)
NATS_URL="${NATS_URL:-nats://nats:4222}"
```

---

## Determine subject

- If `capability` is `capabilities`: subject = `claude.agents.<agent>.capabilities`
- Otherwise: subject = `claude.agents.<agent>.invoke.<capability>`

---

## Send request via bun

```bash
NATS_URL="${NATS_URL}" AGENT="<agent>" SUBJECT="<subject>" PAYLOAD='<payload>' bun --eval "
import { connect, StringCodec } from 'nats';
const sc = StringCodec();
const nc = await connect({ servers: process.env.NATS_URL });

const msg = JSON.stringify({
  schema: '1.0',
  from: 'claude-call',
  ts: new Date().toISOString(),
  type: 'request',
  payload: JSON.parse(process.env.PAYLOAD || '{}'),
});

try {
  const response = await nc.request(process.env.SUBJECT, sc.encode(msg), { timeout: 10000 });
  console.log(sc.decode(response.data));
} catch (e) {
  console.error('Request failed:', e.message);
  process.exit(1);
} finally {
  await nc.close();
}
" 2>&1
```

---

## Display results

Parse the response envelope:
```json
{ "schema": "1.0", "from": "<agent-id>", "ts": "...", "type": "response",
  "payload": { "success": true, "result": {...}, "error": null } }
```

- On success: display `payload.result` in a readable format.
- On error: display `payload.error` and note the agent may not support this capability.
- On timeout: report that the agent did not respond within 10 seconds and suggest
  running `/nats:discover` to verify the agent is online.

---

## Multiple responses

Since multiple agents could share the same ID (unlikely but possible), if the
response `from` field differs from the requested agent, note it to the user.
