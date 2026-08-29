#!/usr/bin/env bash
# Sends /exit + Enter to the pane running this Claude Code session (tmux or
# herdr, whichever the container uses). In herdr mode, also explicitly stops
# the session afterward: unlike tmux, herdr does not tear a session down
# just because its pane's foreground process exited (verified live against
# herdr 0.8.0 in a scratch environment, 2026-08-17) - it silently opens a
# fresh shell instead, which would leave the container running forever
# instead of restarting on /exit like it does today.
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../lib" && pwd)/pane-io.sh"

if [ -z "$(pane_io_active)" ]; then
  echo "Not running inside tmux or herdr — nothing to exit." >&2
  exit 1
fi

pane_id=$(pane_io_current_id)
pane_cmd=$(pane_io_current_cmd "$pane_id")

case "$pane_cmd" in
  claude|node|bun|omp)
    ;;
  *)
    echo "Refusing to send keys: pane $pane_id is running '$pane_cmd', not Claude Code or the omp harness." >&2
    exit 1
    ;;
esac

pane_io_send "$pane_id" "/exit"
echo "Sent /exit to pane $pane_id"

if [ "$(pane_io_active)" = "herdr" ]; then
  sleep 2
  herdr session stop "$HERDR_SESSION"
  echo "Stopped herdr session $HERDR_SESSION"
fi
