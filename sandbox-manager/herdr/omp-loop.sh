#!/usr/bin/env bash
# omp-loop.sh — self-restarting omp pane process (omp-respawn plugin pane).
#
# Runs omp as the herdr plugin pane's process. When omp exits — a deliberate
# /exit or a crash — this wrapper relaunches it with the original args in the
# SAME pane/tab/workspace, so the tab never tears down and neither the
# pane.exited hook nor a container restart is needed for the normal /exit
# path. herdr/restart.sh remains as the fallback for the wrapper itself dying
# (e.g. the pane process being killed outright).
#
# Why this exists: /exit used to rely on `herdr session stop` + the container
# restart policy, and the pane.exited hook alone kept losing the race with
# herdr's auto-close cascade (pane -> last tab -> workspace close), so omp
# regularly came back to a plain bash shell or not at all. Keeping the pane
# process alive and relaunching omp inside it removes the entire cascade from
# the /exit path.
#
# Behavior:
#   - relaunch on ANY exit code (omp exits 1 on /exit; a crash is whatever
#     it is — both mean "start fresh")
#   - crash-loop guard: 3 exits within 5s of launch -> sleep OMP_LOOP_BACKOFF
#     (default 30s), then retry
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
  if [ "$dur" -lt 5 ]; then
    rapid=$((rapid + 1))
    if [ "$rapid" -ge 3 ]; then
      log "rapid restarts ($rapid in a row); backing off ${BACKOFF}s"
      sleep "$BACKOFF"
      rapid=0
    fi
  else
    rapid=0
  fi
done
