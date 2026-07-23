#!/usr/bin/env bash
# Sends /exit + Enter to the tmux pane running this Claude Code session.
set -euo pipefail

if [ -z "${TMUX:-}" ]; then
  echo "Not running inside tmux — nothing to exit." >&2
  exit 1
fi

pane_id=$(tmux display-message -p '#{pane_id}')
pane_cmd=$(tmux display-message -p '#{pane_current_command}')

case "$pane_cmd" in
  claude|node|bun)
    ;;
  *)
    echo "Refusing to send keys: pane $pane_id is running '$pane_cmd', not Claude Code." >&2
    exit 1
    ;;
esac

tmux send-keys -t "$pane_id" "/exit" Enter
echo "Sent /exit to pane $pane_id"
