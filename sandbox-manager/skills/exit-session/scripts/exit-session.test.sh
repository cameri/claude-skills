#!/usr/bin/env bash
# Tests for exit-session.sh, using stub tmux/herdr executables on PATH.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$SCRIPT_DIR/exit-session.sh"
source "$(cd "$SCRIPT_DIR/../../../lib" && pwd)/test-stubs.sh"

pass_count=0
fail_count=0

# exit-session.sh no longer reads $HERDR_SESSION (the herdr session-stop call
# was removed 2026-08-31 — the omp-loop wrapper restarts omp in place); the
# variable is only exported below where a block still wants it for clarity.

# --- (a) refuse when neither multiplexer is active ---
setup
out="$("$TARGET" 2>&1)"; rc=$?
assert_eq "(a) exits non-zero when not in tmux or herdr" "1" "$rc"
teardown

# --- (b) tmux mode: refuse when pane isn't running claude ---
setup
export TMUX="/tmp/fake,1,0"
export STUB_PANE_CMD="bash"
out="$("$TARGET" 2>&1)"; rc=$?
assert_eq "(b) exits non-zero when pane is running bash under tmux" "1" "$rc"
assert_contains "(b) stderr names the offending command" "$out" "bash"
teardown

# --- (c) tmux mode: sends /exit + Enter ---
setup
export TMUX="/tmp/fake,1,0"
export STUB_PANE_CMD="claude"
export STUB_PANE_ID="%3"
out="$("$TARGET" 2>&1)"; rc=$?
assert_eq "(c) exits zero for a claude pane" "0" "$rc"
line_count="$(wc -l < "$TMUX_STUB_LOG" | tr -d ' ')"
assert_eq "(c) exactly two send-keys invocations logged" "2" "$line_count"
assert_eq "(c) sends /exit literally" "-t${us}%3${us}-l${us}--${us}/exit${us}" "$(sed -n '1p' "$TMUX_STUB_LOG")"
assert_eq "(c) sends Enter" "-t${us}%3${us}Enter${us}" "$(sed -n '2p' "$TMUX_STUB_LOG")"
assert_eq "(c) no herdr session stop in tmux mode" "" "$(cat "$HERDR_SESSION_STOP_LOG")"
teardown

# --- (d) herdr mode: sends /exit via agent prompt ---
setup
export HERDR_ENV=1
export HERDR_PANE_ID="w1:p1"
export STUB_PANE_ARGV0="claude"
out="$("$TARGET" 2>&1)"; rc=$?
assert_eq "(d) exits zero for a claude pane, herdr mode" "0" "$rc"
line_count="$(wc -l < "$HERDR_STUB_LOG" | tr -d ' ')"
assert_eq "(d) exactly one herdr call logged (agent prompt)" "1" "$line_count"
assert_eq "(d) agent prompt sends pane id and /exit" "w1:p1${us}/exit${us}" "$(sed -n '1p' "$HERDR_STUB_LOG")"
teardown

# --- (e) herdr mode: NO session stop after sending /exit (wrapper restarts omp) ---
setup
export HERDR_ENV=1
export HERDR_PANE_ID="w1:p1"
export HERDR_SESSION="probe"
export STUB_PANE_ARGV0="claude"
out="$("$TARGET" 2>&1)"; rc=$?
assert_eq "(e) exits zero for a claude pane, herdr mode" "0" "$rc"
assert_eq "(e) sent /exit via agent prompt" "w1:p1${us}/exit${us}" "$(sed -n '1p' "$HERDR_STUB_LOG")"
assert_eq "(e) no herdr session stop (wrapper relaunches omp in place)" "" "$(cat "$HERDR_SESSION_STOP_LOG")"
teardown

# --- (f) herdr mode: accepts an omp pane (the harness hosting Claude Code) ---
setup
export HERDR_ENV=1
export HERDR_PANE_ID="w1:p1"
export STUB_PANE_ARGV0="omp"
out="$("$TARGET" 2>&1)"; rc=$?
assert_eq "(f) exits zero for an omp pane, herdr mode" "0" "$rc"
line_count="$(wc -l < "$HERDR_STUB_LOG" | tr -d ' ')"
assert_eq "(f) exactly one herdr call logged (agent prompt)" "1" "$line_count"
teardown

# --- (g) herdr mode: accepts a bash pane (the omp-loop wrapper's foreground) ---
setup
export HERDR_ENV=1
export HERDR_PANE_ID="w1:p1"
export STUB_PANE_ARGV0="bash"
out="$("$TARGET" 2>&1)"; rc=$?
assert_eq "(g) exits zero for a bash pane under herdr (wrapper)" "0" "$rc"
assert_eq "(g) sent /exit via agent prompt" "w1:p1${us}/exit${us}" "$(sed -n '1p' "$HERDR_STUB_LOG")"
teardown

echo
echo "$pass_count passed, $fail_count failed"
[ "$fail_count" -eq 0 ]
