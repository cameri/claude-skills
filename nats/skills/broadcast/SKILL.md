---
name: broadcast
description: Broadcast a capability invocation to all Claude Code agents on the NATS network and collect their responses. Use when the user says "broadcast to agents", "ask all agents to", "send to all agents", or wants to invoke a capability on every agent simultaneously.
user-invocable: true
allowed-tools:
  - Read
  - Bash(bun *)
  - Bash(cat *)
  - Bash(ls *)
  - Bash(grep *)
---

# /nats:broadcast — Broadcast a Capability to All Agents

Publishes a request on `claude.agents.broadcast.<capability>` and collects
responses from all agents for 5 seconds.

Arguments passed: `$ARGUMENTS`

---

## Parsing `$ARGUMENTS`

Expected format: `<capability> [JSON payload]`

Examples:
- `nats:status`
- `capabilities`
- `invoke '{"capability":"nats:discover"}'`

Parse:
- **capability** — first token
- **payload** — remaining text as JSON (default: `{}`)

If capability is missing, list common options and ask the user to specify one.

---

## Prerequisites

Resolve NATS_URL:
```bash
NATS_URL=$(grep NATS_URL ~/.claude/channels/nats/.env 2>/dev/null | cut -d= -f2)
NATS_URL="${NATS_URL:-nats://nats:4222}"
```

---

## Subject

`claude.agents.broadcast.<capability>`

---

## Send broadcast via bun

```bash
NATS_URL="${NATS_URL}" CAPABILITY="<capability>" PAYLOAD='<payload>' bun --eval "
import { connect, StringCodec } from 'nats';
const sc = StringCodec();
const nc = await connect({ servers: process.env.NATS_URL });

const subject = 'claude.agents.broadcast.' + process.env.CAPABILITY;
const msg = JSON.stringify({
  schema: '1.0',
  from: 'claude-broadcast',
  ts: new Date().toISOString(),
  type: 'request',
  payload: JSON.parse(process.env.PAYLOAD || '{}'),
});

const responses = {};

// Use a reply-to inbox to collect responses
const inbox = nc.createInbox ? nc.createInbox() : '_INBOX.' + Math.random().toString(36).slice(2);
const sub = nc.subscribe(inbox);
const collect = (async () => {
  for await (const reply of sub) {
    try {
      const data = JSON.parse(sc.decode(reply.data));
      responses[data.from || 'unknown'] = data.payload;
    } catch {}
  }
})();

// Publish with reply-to subject
nc.publish(subject, sc.encode(msg), { reply: inbox });

// Wait 5 seconds for all agents to respond
await new Promise(r => setTimeout(r, 5000));
sub.unsubscribe();
await nc.drain();

console.log(JSON.stringify(responses, null, 2));
" 2>&1
```

---

## Display results

Parse the JSON response map `{ "<agent-id>": { success, result, error }, ... }`:

For each responding agent:
```
Agent <agent-id>:
  ✓ <result summary>  (or ✗ <error>)
```

Summary line:
> Broadcast `<capability>` to `<count>` agent(s). `<success-count>` responded successfully.

If no agents responded:
> No agents responded to the broadcast. Verify agents are running with `/nats:discover`.

---

## When agent decides what to do with multiple responses

The caller (this skill) collects all responses within the 5-second window and
presents them all. The user can then decide which response(s) to act on.
Additional responses that arrive after the window are silently ignored.
