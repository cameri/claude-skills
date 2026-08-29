#!/usr/bin/env bash
# Sends /clear (Claude Code) or /reset (omp) + Enter to the pane running
# this session (tmux or herdr, whichever the container uses). omp's TUI
# has no /clear command and swallows unknown /-commands without forwarding
# them to the embedded Claude Code, so a bare /clear never reaches the
# agent under omp — /reset is omp's in-place conversation reset.
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../lib" && pwd)/pane-io.sh"

if [ -z "$(pane_io_active)" ]; then
  echo "Not running inside tmux or herdr — nothing to restart." >&2
  exit 1
fi

pane_id=$(pane_io_current_id)
pane_cmd=$(pane_io_current_cmd "$pane_id")

case "$pane_cmd" in
  claude|node|bun)
    reset_cmd="/clear"
    ;;
  omp)
    reset_cmd="/reset"
    ;;
  *)
    echo "Refusing to send keys: pane $pane_id is running '$pane_cmd', not Claude Code or the omp harness." >&2
    exit 1
    ;;
esac

pane_io_send "$pane_id" "$reset_cmd"
echo "Sent $reset_cmd to pane $pane_id"
