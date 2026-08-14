#!/usr/bin/env bash
# Sends /compact [retention-instructions] + Enter to the tmux pane running
# this Claude Code session.
set -euo pipefail

if [ $# -gt 1 ]; then
  echo "Usage: $0 [retention-instructions]" >&2
  exit 1
fi

if [ -z "${TMUX:-}" ]; then
  echo "Not running inside tmux — nothing to compact." >&2
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

if [ $# -eq 1 ] && [ -n "$1" ]; then
  command="/compact $1"
else
  command="/compact"
fi

# -l sends the text literally so it can't be misread as tmux key names.
tmux send-keys -t "$pane_id" -l -- "$command"
tmux send-keys -t "$pane_id" Enter
echo "Sent $command to pane $pane_id"
