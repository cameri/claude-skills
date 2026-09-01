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
      # argv[0] of the first foreground process is the reliable command name
      # (the JSON's "name" field is unreliable - e.g. reports "MainThread" for
      # a node process, verified live against herdr 0.8.0). But a pane process
      # may be a wrapper around the real agent: omp under herdr/omp-loop.sh
      # shows "bash" first, with the actual agent as a later foreground
      # process. Scan the whole list for a known agent command and return the
      # first match; fall back to the first process's command so callers'
      # refusal branches still fire for genuinely non-agent panes.
      local argv0s a
      argv0s="$(herdr pane process-info --pane "$pane_id" \
        | jq -r '.result.process_info.foreground_processes[].argv[0] // empty')"
      while IFS= read -r a; do
        case "${a##*/}" in
          omp|claude|node|bun)
            echo "${a##*/}"
            return 0
            ;;
        esac
      done <<< "$argv0s"
      echo "${argv0s%%$'\n'*}"
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
      # `herdr agent prompt` is the only submission path herdr documents as
      # honoring the pane's live bracketed-paste mode: it sends the text
      # followed by an encoded Enter after a short delay. Raw
      # send-text/send-keys can leave a slash command sitting unsubmitted in
      # the TUI's input box with autocomplete still open (observed live with
      # omp 18.x: a /reset never fired and produced no error), so route
      # agent-pane input through agent prompt.
      herdr agent prompt "$pane_id" "$text"
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
