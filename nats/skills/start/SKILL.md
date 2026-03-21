---
name: start
description: Start the Claude Code NATS agent server so this instance is discoverable by other agents. Use when the user says "start nats", "connect to nats", "start the nats agent", or wants to join the agent network.
user-invocable: true
allowed-tools:
  - Read
  - Bash(cat *)
  - Bash(ls *)
  - Bash(mkdir *)
  - Bash(bun *)
  - Bash(kill *)
  - Bash(ps *)
---

# /nats:start — Start the NATS Agent Server

Starts a background bun process that registers this Claude Code instance as a
discoverable NATS service. The server announces capabilities on startup and
responds to discovery pings from other agents.

Arguments passed: `$ARGUMENTS`

---

## Prerequisites check

1. Check if already running:
   ```bash
   cat /tmp/nats-agent.pid 2>/dev/null
   ```
   If the file exists, verify the process is alive:
   ```bash
   kill -0 $(cat /tmp/nats-agent.pid) 2>/dev/null && echo "running" || echo "stale"
   ```
   - If running: report the PID and that the agent is already active. Suggest
     `/nats:status` to view details. Stop here.
   - If stale: remove the PID file and continue.

2. Resolve the server script path:
   ```
   ~/.claude/skills/nats/start/scripts/server.ts
   ```

3. Install dependencies if not already installed:
   ```bash
   ls ~/.claude/skills/nats/start/scripts/node_modules/nats 2>/dev/null || \
     bun install --cwd ~/.claude/skills/nats/start/scripts
   ```

4. Resolve NATS_URL from env file (if configured):
   ```bash
   [ -f ~/.claude/channels/nats/.env ] && source ~/.claude/channels/nats/.env
   echo "${NATS_URL:-nats://nats:4222}"
   ```

---

## Launch

Start the server in the background, redirecting output to a log file:

```bash
NATS_URL="${NATS_URL:-nats://nats:4222}" \
  bun ~/.claude/skills/nats/start/scripts/server.ts \
  >> /tmp/nats-agent.log 2>&1 &
echo $!
```

Wait 2 seconds, then confirm it started:
```bash
sleep 2 && kill -0 $(cat /tmp/nats-agent.pid 2>/dev/null) 2>/dev/null && echo "ok" || echo "failed"
```

---

## Report

On success:
> Agent started (PID: `<pid>`). NATS URL: `<url>`
> Logs: `/tmp/nats-agent.log`
> Run `/nats:status` to see discovered agents.

On failure: show the last 20 lines of `/tmp/nats-agent.log` to help diagnose
the issue and suggest running `/nats:configure` if NATS_URL is not set.
