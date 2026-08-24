#!/usr/bin/env bash
# Tests for branch-session.sh, using stub tmux/herdr executables on PATH.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$SCRIPT_DIR/branch-session.sh"
source "$(cd "$SCRIPT_DIR/../../../lib" && pwd)/test-stubs.sh"

pass_count=0
fail_count=0

setup
out="$("$TARGET" 2>&1)"; rc=$?
assert_eq "(a) exits non-zero when not in tmux or herdr" "1" "$rc"
teardown

setup
export TMUX="/tmp/fake,1,0"
export STUB_PANE_CMD="bash"
out="$("$TARGET" 2>&1)"; rc=$?
assert_eq "(b) exits non-zero when pane is running bash" "1" "$rc"
assert_contains "(b) stderr names the offending command" "$out" "bash"
teardown

setup
export TMUX="/tmp/fake,1,0"
export STUB_PANE_CMD="claude"
export STUB_PANE_ID="%3"
out="$("$TARGET" 2>&1)"; rc=$?
assert_eq "(c) exits zero for a claude pane" "0" "$rc"
line_count="$(wc -l < "$TMUX_STUB_LOG" | tr -d ' ')"
assert_eq "(c) exactly two send-keys invocations logged" "2" "$line_count"
assert_eq "(c) sends /branch literally" "-t${us}%3${us}-l${us}--${us}/branch${us}" "$(sed -n '1p' "$TMUX_STUB_LOG")"
assert_eq "(c) sends Enter" "-t${us}%3${us}Enter${us}" "$(sed -n '2p' "$TMUX_STUB_LOG")"
teardown

setup
export HERDR_ENV=1
export HERDR_PANE_ID="w1:p1"
export STUB_PANE_ARGV0="claude"
out="$("$TARGET" 2>&1)"; rc=$?
assert_eq "(d) exits zero for a claude pane, herdr mode" "0" "$rc"
line_count="$(wc -l < "$HERDR_STUB_LOG" | tr -d ' ')"
assert_eq "(d) exactly two herdr calls logged (send-text, send-keys)" "2" "$line_count"
assert_eq "(d) send-text sends pane id and /branch" "w1:p1${us}/branch${us}" "$(sed -n '1p' "$HERDR_STUB_LOG")"
assert_eq "(d) send-keys sends pane id and enter" "w1:p1${us}enter${us}" "$(sed -n '2p' "$HERDR_STUB_LOG")"
teardown

echo
echo "$pass_count passed, $fail_count failed"
[ "$fail_count" -eq 0 ]
