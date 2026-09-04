#!/usr/bin/env bash
# omp-respawn event hook: reopen the omp plugin pane when omp exits.
#
# Runs as a herdr plugin event hook ([[events]] on = "pane.exited"). herdr
# provides HERDR_PLUGIN_EVENT_JSON ({"event":"pane_exited","data":{...,
# "pane_id":...,"workspace_id":...}}), HERDR_PLUGIN_STATE_DIR, HERDR_BIN_PATH.
#
# Restart policy (2026-09-04): reopen ONLY after a crash. A deliberate /exit
# makes herdr/omp-loop.sh write the stop marker before exiting, so this hook
# stays suppressed for the /exit path. The primary restart path is
# herdr/omp-loop.sh relaunching omp on signal death inside the pane; this
# hook only fires when the pane's process itself died. When the exited pane
# held its workspace's last tab, herdr's auto-close cascade (pane -> tab ->
# workspace) has already closed the workspace by the time this hook runs, so
# the workspace_id in the event may no longer exist — recreate it with the
# configured cwd/label, then open the pane there.
#
# To keep omp down for maintenance: touch "$HERDR_PLUGIN_STATE_DIR/stop".
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

# Workspace identity used when the workspace must be recreated (it closes
# with its last pane, so the event's workspace_id is usually stale). Override
# via $HERDR_PLUGIN_CONFIG_DIR/respawn.env: WS_CWD=... WS_LABEL=...
WS_CWD="/workspace"
WS_LABEL="omp"
if [ -n "${HERDR_PLUGIN_CONFIG_DIR:-}" ] && [ -f "$HERDR_PLUGIN_CONFIG_DIR/respawn.env" ]; then
  # shellcheck source=/dev/null
  . "$HERDR_PLUGIN_CONFIG_DIR/respawn.env"
fi

open_in() {
  "$HERDR_BIN_PATH" plugin pane open --plugin omp-respawn --entrypoint omp --workspace "$1" 2>&1
}

out=$(open_in "$ws")
rc=$?
if [ "$rc" -eq 0 ]; then
  echo "$iso reopened omp in workspace $ws" >> "$LOG"
  exit 0
fi
case "$out" in
  *workspace_not_found*)
    echo "$iso workspace $ws no longer exists (closed with its last pane); recreating (cwd=$WS_CWD label=$WS_LABEL)" >> "$LOG"
    ;;
  *)
    echo "$iso pane open into $ws failed: $out" >> "$LOG"
    exit 1
    ;;
esac

created=$("$HERDR_BIN_PATH" workspace create --cwd "$WS_CWD" --label "$WS_LABEL" --no-focus 2>&1)
new_ws=$(printf '%s' "$created" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get("result", {}).get("workspace", {}).get("workspace_id", ""))
except Exception:
    print("")')
root_pane=$(printf '%s' "$created" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get("result", {}).get("root_pane", {}).get("pane_id", ""))
except Exception:
    print("")')
if [ -z "$new_ws" ]; then
  echo "$iso workspace create failed: $created" >> "$LOG"
  exit 1
fi
echo "$iso created workspace $new_ws" >> "$LOG"

out=$(open_in "$new_ws")
rc=$?
if [ "$rc" -eq 0 ]; then
  echo "$iso reopened omp in workspace $new_ws" >> "$LOG"
  # workspace create auto-creates a root shell pane in the first tab; close
  # it so the recreated workspace holds only the omp pane (no stray tab).
  if [ -n "$root_pane" ]; then
    "$HERDR_BIN_PATH" pane close "$root_pane" >> "$LOG" 2>&1
  fi
  "$HERDR_BIN_PATH" workspace focus "$new_ws" >> "$LOG" 2>&1
else
  echo "$iso pane open into $new_ws failed: $out" >> "$LOG"
  exit 1
fi
