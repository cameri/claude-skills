#!/usr/bin/env bash
# Multiplexer-agnostic pane control for sandbox-manager's session-control
# scripts. Detects tmux vs herdr at runtime via $TMUX/$HERDR_ENV (mutually
# exclusive - a container runs exactly one) so the same script works
# whichever multiplexer the container is on, without a hard cutover.
#
# Source this file, then call:
#   pane_io_active                 -> echoes "tmux", "herdr", or "" (neither)
#   pane_io_current_id             -> echoes the current pane's ID
#   pane_io_current_cmd <pane_id>  -> echoes the pane's foreground command basename
#   pane_io_send <pane_id> <text>  -> sends text + Enter to the pane

pane_io_active() {
  if [ -n "${HERDR_ENV:-}" ]; then
    echo "herdr"
  elif [ -n "${TMUX:-}" ]; then
    echo "tmux"
  else
    echo ""
  fi
}

pane_io_current_id() {
  case "$(pane_io_active)" in
    herdr) echo "$HERDR_PANE_ID" ;;
    tmux)  tmux display-message -p '#{pane_id}' ;;
    *)     return 1 ;;
  esac
}

pane_io_current_cmd() {
  local pane_id="$1"
  case "$(pane_io_active)" in
    herdr)
      # The JSON's "name" field is unreliable (e.g. reports "MainThread" for
      # a node process, verified live against herdr 0.8.0) - argv[0] is the
      # actual command, basenamed to match tmux's bare-name convention.
      local argv0
      argv0="$(herdr pane process-info --pane "$pane_id" \
        | jq -r '.result.process_info.foreground_processes[0].argv[0] // empty')"
      echo "${argv0##*/}"
      ;;
    tmux)
      tmux display-message -p '#{pane_current_command}'
      ;;
    *)
      return 1
      ;;
  esac
}

pane_io_send() {
  local pane_id="$1" text="$2"
  case "$(pane_io_active)" in
    herdr)
      herdr pane run "$pane_id" "$text"
      ;;
    tmux)
      # -l sends the text literally so it can't be misread as tmux key names.
      tmux send-keys -t "$pane_id" -l -- "$text"
      tmux send-keys -t "$pane_id" Enter
      ;;
    *)
      return 1
      ;;
  esac
}
