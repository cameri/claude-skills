#!/usr/bin/env bash
# Sends /rename <name> + Enter to the pane running this Claude Code session
# (tmux or herdr, whichever the container uses).
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../lib" && pwd)/pane-io.sh"

if [ $# -ne 1 ] || [ -z "$1" ]; then
  echo "Usage: $0 <session-name>" >&2
  exit 1
fi

if [ -z "$(pane_io_active)" ]; then
  echo "Not running inside tmux or herdr — nothing to rename." >&2
  exit 1
fi

pane_id=$(pane_io_current_id)
pane_cmd=$(pane_io_current_cmd "$pane_id")

case "$pane_cmd" in
  claude|node|bun)
    ;;
  *)
    echo "Refusing to send keys: pane $pane_id is running '$pane_cmd', not Claude Code." >&2
    exit 1
    ;;
esac

pane_io_send "$pane_id" "/rename $1"
echo "Sent /rename $1 to pane $pane_id"
