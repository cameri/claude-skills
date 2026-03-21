---
name: discover
description: Discover all Claude Code agents on the NATS network and list their capabilities. Use when the user says "discover agents", "who's on nats", "list nats agents", "find agents", or wants to see what agents are available.
user-invocable: true
allowed-tools:
  - Read
  - Bash(bun *)
  - Bash(cat *)
  - Bash(ls *)
  - Bash(sleep *)
  - Bash(nats *)
---

# /nats:discover — Discover NATS Agents

Sends a discovery ping on `claude.discovery.ping` and collects pong responses
for 3 seconds. All responding agents are listed with their capabilities.
Results are also written to `/tmp/nats-agents.json`.

Arguments passed: `$ARGUMENTS`

---

## Prerequisites

1. Resolve NATS_URL:
   ```bash
   NATS_URL=$(grep NATS_URL ~/.claude/channels/nats/.env 2>/dev/null | cut -d= -f2)
   NATS_URL="${NATS_URL:-nats://nats:4222}"
   ```

2. Check if the local agent is running:
   ```bash
   kill -0 $(cat /tmp/nats-agent.pid 2>/dev/null) 2>/dev/null && echo "running" || echo "not running"
   ```
   If not running, note that the local agent won't be counted but discovery
   can still proceed using the `nats` CLI.

---

## Discovery via bun script

Run this inline bun script to send a ping and collect pongs for 3 seconds:

```bash
NATS_URL="${NATS_URL:-nats://nats:4222}" bun --eval "
import { connect, StringCodec } from 'nats';
const sc = StringCodec();
const nc = await connect({ servers: process.env.NATS_URL });
const agents = {};

// Subscribe to pong responses
const sub = nc.subscribe('claude.discovery.pong');
const collect = (async () => {
  for await (const msg of sub) {
    try {
      const data = JSON.parse(sc.decode(msg.data));
      if (data.from && data.payload) {
        agents[data.from] = { ...data.payload, lastSeen: new Date().toISOString() };
      }
    } catch {}
  }
})();

// Send ping
const ping = JSON.stringify({
  schema: '1.0',
  from: 'discover-probe',
  ts: new Date().toISOString(),
  type: 'request',
  payload: {},
});
nc.publish('claude.discovery.ping', sc.encode(ping));

// Wait 3 seconds for responses
await new Promise(r => setTimeout(r, 3000));
sub.unsubscribe();
await nc.drain();

// Write cache and print results
import { writeFileSync } from 'fs';
writeFileSync('/tmp/nats-agents.json', JSON.stringify(agents, null, 2));
console.log(JSON.stringify(agents, null, 2));
" 2>&1
```

---

## Display results

Parse the JSON output and display a structured summary:

For each discovered agent:
```
Agent: <agentId>
  Name: <name>
  Last seen: <lastSeen>
  Capabilities (<count>):
    - [<type>] <name>: <description>
    ...
```

If no agents responded:
> No agents discovered. Make sure at least one agent is running and connected
> to the same NATS server (`$NATS_URL`).

Also note the cache was written to `/tmp/nats-agents.json`.

---

## Fallback

If the bun script fails (e.g. nats package not installed), fall back to using
the `nats` CLI if available:

```bash
nats --server "$NATS_URL" sub "claude.discovery.pong" --count 10 --timeout 3s 2>&1 &
nats --server "$NATS_URL" pub "claude.discovery.ping" '{"schema":"1.0","from":"probe","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","type":"request","payload":{}}' 2>&1
```

Then parse the output manually.
