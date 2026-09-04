#!/usr/bin/env bash
# omp-loop.sh — omp pane process (omp-respawn plugin pane).
#
# Runs omp as the herdr plugin pane's process. Restart policy (2026-09-04):
#   - clean exit (code < 128, e.g. /exit or a tab close) is INTENTIONAL: the
#     loop writes the stop marker and stays down. Nothing reopens omp until
#     the marker is cleared (rm "$STATE/stop") or the container restarts
#     (/tmp state is wiped). Multiple omp instances sharing one bot token
#     break each other's channel MCP pollers (409 ping-pong), so /exit must
#     not resurrect the session.
#   - signal death (code >= 128, i.e. a real crash) relaunches omp in the
#     SAME pane/tab/workspace. herdr/restart.sh remains the fallback for the
#     wrapper itself dying (e.g. the pane process being killed outright).
#
# Why this wrapper exists: the pane.exited hook alone kept losing the race
# with herdr's auto-close cascade (pane -> last tab -> workspace close), so
# omp regularly came back to a plain bash shell or not at all. Keeping the
# pane process alive across crash restarts removes the cascade from the
# crash path.
#
# Behavior:
#   - relaunch ONLY on signal death (exit code >= 128)
#   - clean exit: write $STATE/stop and exit 0 — omp stays down
#   - crash-loop guard: 3 crashes within 5s of launch -> sleep
#     OMP_LOOP_BACKOFF (default 30s), then retry
#   - maintenance: touch $STATE/stop to keep omp down. The loop exits, the
#     pane closes, and restart.sh's own stop-marker guard suppresses any
#     reopen.
#   - args after `--` replace the default launch args (defaults below).
#
# State/logs live under $HERDR_PLUGIN_STATE_DIR (herdr-injected), matching
# restart.sh's directory.
set -u

STATE="${OMP_LOOP_STATE_DIR:-${HERDR_PLUGIN_STATE_DIR:-/tmp/omp-respawn}}"
STOP="$STATE/stop"
LOG="$STATE/omp-loop.log"
BACKOFF="${OMP_LOOP_BACKOFF:-30}"
mkdir -p "$STATE"

# Default launch args — omp with the workspace cwd and auto-approve, the same
# command the [[panes]] entrypoint historically declared. Override per-launch
# with: omp-loop.sh -- <args...>
if [ "$#" -gt 0 ] && [ "$1" = "--" ]; then
  shift
fi
if [ "$#" -gt 0 ]; then
  args=("$@")
else
  args=(omp --cwd /workspace --auto-approve)
fi

log() { echo "$(date -u +%FT%TZ) $*" >> "$LOG"; }

rapid=0
while true; do
  if [ -f "$STOP" ]; then
    log "stop marker present ($STOP); keeping omp down"
    exit 0
  fi
  log "starting omp: ${args[*]}"
  start=$(date +%s)
  "${args[@]}"
  code=$?
  dur=$(($(date +%s) - start))
  log "omp exited code=$code after ${dur}s"
  if [ "$code" -ge 128 ]; then
    log "omp died by signal (code=$code) after ${dur}s; treating as crash"
    if [ "$dur" -lt 5 ]; then
      rapid=$((rapid + 1))
      if [ "$rapid" -ge 3 ]; then
        log "rapid crashes ($rapid in a row); backing off ${BACKOFF}s"
        sleep "$BACKOFF"
        rapid=0
      fi
    else
      rapid=0
    fi
  else
    log "omp exited cleanly (code=$code); writing stop marker — omp stays down (clear $STOP or restart the container to reopen)"
    touch "$STOP"
    exit 0
  fi
done
