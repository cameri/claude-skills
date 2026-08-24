#!/usr/bin/env bash
# Tests for exit-session.sh, using stub tmux/herdr executables on PATH.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$SCRIPT_DIR/exit-session.sh"
source "$(cd "$SCRIPT_DIR/../../../lib" && pwd)/test-stubs.sh"

pass_count=0
fail_count=0

# exit-session.sh reads $HERDR_SESSION for the herdr session-stop call;
# other session-control scripts don't, so the shared setup() doesn't set a
# default — each block below exports one right after calling setup.

# --- (a) refuse when neither multiplexer is active ---
setup
export HERDR_SESSION="unused-session"
out="$("$TARGET" 2>&1)"; rc=$?
assert_eq "(a) exits non-zero when not in tmux or herdr" "1" "$rc"
teardown

# --- (b) tmux mode: refuse when pane isn't running claude ---
setup
export HERDR_SESSION="unused-session"
export TMUX="/tmp/fake,1,0"
export STUB_PANE_CMD="bash"
out="$("$TARGET" 2>&1)"; rc=$?
assert_eq "(b) exits non-zero when pane is running bash" "1" "$rc"
assert_contains "(b) stderr names the offending command" "$out" "bash"
teardown

# --- (c) tmux mode: sends /exit + Enter ---
setup
export HERDR_SESSION="unused-session"
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

# --- (d) herdr mode: sends /exit via send-text + send-keys enter ---
setup
export HERDR_SESSION="unused-session"
export HERDR_ENV=1
export HERDR_PANE_ID="w1:p1"
export STUB_PANE_ARGV0="claude"
out="$("$TARGET" 2>&1)"; rc=$?
assert_eq "(d) exits zero for a claude pane, herdr mode" "0" "$rc"
line_count="$(wc -l < "$HERDR_STUB_LOG" | tr -d ' ')"
assert_eq "(d) exactly two herdr calls logged (send-text, send-keys)" "2" "$line_count"
assert_eq "(d) send-text sends pane id and /exit" "w1:p1${us}/exit${us}" "$(sed -n '1p' "$HERDR_STUB_LOG")"
assert_eq "(d) send-keys sends pane id and enter" "w1:p1${us}enter${us}" "$(sed -n '2p' "$HERDR_STUB_LOG")"
teardown

# --- (e) herdr mode: also calls session stop after sending /exit ---
setup
export HERDR_ENV=1
export HERDR_PANE_ID="w1:p1"
export HERDR_SESSION="probe"
export STUB_PANE_ARGV0="claude"
out="$("$TARGET" 2>&1)"; rc=$?
assert_eq "(e) exits zero for a claude pane, herdr mode" "0" "$rc"
assert_eq "(e) sent /exit via send-text" "w1:p1${us}/exit${us}" "$(sed -n '1p' "$HERDR_STUB_LOG")"
assert_eq "(e) sent enter via send-keys" "w1:p1${us}enter${us}" "$(sed -n '2p' "$HERDR_STUB_LOG")"
assert_eq "(e) called session stop with the session name" "probe" "$(cat "$HERDR_SESSION_STOP_LOG")"
teardown

echo
echo "$pass_count passed, $fail_count failed"
[ "$fail_count" -eq 0 ]
