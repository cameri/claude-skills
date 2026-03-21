---
name: stop
description: Stop the running Claude Code NATS agent server. Use when the user says "stop nats", "disconnect from nats", "stop the nats agent", or wants to leave the agent network.
user-invocable: true
allowed-tools:
  - Bash(cat *)
  - Bash(kill *)
  - Bash(rm *)
---

# /nats:stop — Stop the NATS Agent Server

Stops the background NATS agent server process.

Arguments passed: `$ARGUMENTS`

---

## Steps

1. Read the PID file:
   ```bash
   cat /tmp/nats-agent.pid 2>/dev/null
   ```
   If not found: report that no agent is running. Stop here.

2. Check if the process is alive:
   ```bash
   kill -0 <PID> 2>/dev/null && echo "running" || echo "gone"
   ```

3. If running: send SIGTERM and wait up to 5 seconds for clean exit:
   ```bash
   kill -TERM <PID>
   for i in 1 2 3 4 5; do
     sleep 1
     kill -0 <PID> 2>/dev/null || break
   done
   # Force kill if still alive
   kill -0 <PID> 2>/dev/null && kill -KILL <PID> && echo "force-killed"
   ```

4. Remove PID file:
   ```bash
   rm -f /tmp/nats-agent.pid
   ```

5. Report: "NATS agent stopped."

If the PID file existed but the process was already gone: remove the stale
PID file and report that the agent was not running (already stopped).
