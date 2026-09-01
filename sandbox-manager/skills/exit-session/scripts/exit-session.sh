#!/usr/bin/env bash
# Sends /exit + Enter to the pane running this Claude Code session (tmux or
# herdr, whichever the container uses).
#
# On herdr, the omp pane process is a self-restarting wrapper
# (herdr/omp-loop.sh): /exit ends Claude Code, and the wrapper relaunches omp
# with its original args in the same pane — no session stop or container
# restart needed. (Calling `herdr session stop` here used to tear the whole
# session/server down and rely on the container restart policy, which came
# back with a plain bash shell instead of omp — removed 2026-08-31.) On tmux,
# the container restart policy (compose `restart: unless-stopped`) still
# brings the session back.
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../lib" && pwd)/pane-io.sh"

if [ -z "$(pane_io_active)" ]; then
  echo "Not running inside tmux or herdr — nothing to exit." >&2
  exit 1
fi

pane_id=$(pane_io_current_id)
pane_cmd=$(pane_io_current_cmd "$pane_id")

reject() {
  echo "Refusing to send keys: pane $pane_id is running '$pane_cmd', not Claude Code or the omp harness." >&2
  exit 1
}

case "$pane_cmd" in
  claude|node|bun|omp)
    ;;
  bash)
    # Under herdr the pane's process is the omp-loop wrapper, whose
    # foreground flips to bash for the instant between omp relaunches.
    if [ "$(pane_io_active)" != "herdr" ]; then
      reject
    fi
    ;;
  *)
    reject
    ;;
esac

pane_io_send "$pane_id" "/exit"
echo "Sent /exit to pane $pane_id"
