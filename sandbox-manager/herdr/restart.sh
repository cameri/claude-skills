#!/usr/bin/env bash
# omp-respawn event hook: reopen the omp plugin pane when omp exits.
#
# Runs as a herdr plugin event hook ([[events]] on = "pane.exited"). herdr
# provides HERDR_PLUGIN_EVENT_JSON ({"event":"pane_exited","data":{...,
# "pane_id":...,"workspace_id":...}}), HERDR_PLUGIN_STATE_DIR, HERDR_BIN_PATH.
#
# Restart policy: restart always on pane exit (crash OR deliberate /exit —
# /exit is the config-reload ritual, so auto-restart preserves it). To keep
# omp down for maintenance: touch "$HERDR_PLUGIN_STATE_DIR/stop".
set -u
: "${HERDR_BIN_PATH:=herdr}"
: "${HERDR_PLUGIN_STATE_DIR:=/tmp/omp-respawn}"
STATE="$HERDR_PLUGIN_STATE_DIR"
STOP="$STATE/stop"
LOG="$STATE/restart.log"
mkdir -p "$STATE"
iso=$(date -u +%FT%TZ)

# Deliberate shutdown: touch $STATE/stop to keep omp down.
if [ -f "$STOP" ]; then
  echo "$iso pane exited; suppressed by stop marker ($STOP)" >> "$LOG"
  exit 0
fi

# Crash-loop guard: more than 5 exits in a 60s window -> back off 30s.
now=$(date +%s)
echo "$now" >> "$STATE/restarts"
recent=$(awk -v n="$now" 'n-$1 <= 60' "$STATE/restarts" | wc -l)
tail -n 50 "$STATE/restarts" > "$STATE/restarts.tmp" && mv "$STATE/restarts.tmp" "$STATE/restarts"
if [ "$recent" -gt 5 ]; then
  echo "$iso crash-loop backoff (exits in window: $recent); sleeping 30s" >> "$LOG"
  sleep 30
fi

# Reopen in the workspace the exited pane belonged to.
ws=$(printf '%s' "${HERDR_PLUGIN_EVENT_JSON:-}" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get("data", {}).get("workspace_id", ""))
except Exception:
    print("")')
if [ -z "$ws" ]; then
  echo "$iso no workspace_id in event envelope; skipping restart" >> "$LOG"
  exit 1
fi

echo "$iso restarting omp in workspace $ws" >> "$LOG"
"$HERDR_BIN_PATH" plugin pane open --plugin omp-respawn --entrypoint omp --workspace "$ws" >> "$LOG" 2>&1
