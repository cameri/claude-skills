#!/usr/bin/env bash
# Sends /resume <name> + Enter to the tmux pane running this Claude Code session.
set -euo pipefail

if [ $# -ne 1 ] || [ -z "$1" ]; then
  echo "Usage: $0 <session-name>" >&2
  exit 1
fi

if [ -z "${TMUX:-}" ]; then
  echo "Not running inside tmux — nothing to resume." >&2
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

# -l sends the text literally so the name can't be misread as tmux key names.
tmux send-keys -t "$pane_id" -l -- "/resume $1"
tmux send-keys -t "$pane_id" Enter
echo "Sent /resume $1 to pane $pane_id"
