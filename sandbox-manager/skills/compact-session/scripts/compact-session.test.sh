#!/usr/bin/env bash
# Tests for compact-session.sh, using a stub tmux executable placed on PATH.
# Plain-bash test runner: each check is an explicit assert, failures are
# tallied, and the script exits non-zero overall if anything failed.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$SCRIPT_DIR/compact-session.sh"

pass_count=0
fail_count=0

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    pass_count=$((pass_count + 1))
    echo "ok - $desc"
  else
    fail_count=$((fail_count + 1))
    echo "not ok - $desc"
    echo "    expected: $expected"
    echo "    actual:   $actual"
  fi
}

assert_contains() {
  local desc="$1" haystack="$2" needle="$3"
  case "$haystack" in
    *"$needle"*)
      pass_count=$((pass_count + 1))
      echo "ok - $desc"
      ;;
    *)
      fail_count=$((fail_count + 1))
      echo "not ok - $desc"
      echo "    expected to contain: $needle"
      echo "    actual:              $haystack"
      ;;
  esac
}

# Sets up a temp dir with a stub tmux on PATH, a fresh send-keys log, and
# exports STUB_PANE_CMD / STUB_PANE_ID for the stub's display-message replies.
setup() {
  TEST_TMP="$(mktemp -d)"
  STUB_DIR="$TEST_TMP/bin"
  mkdir -p "$STUB_DIR"
  cat > "$STUB_DIR/tmux" <<'EOF'
#!/usr/bin/env bash
# Stub tmux: records send-keys calls, answers display-message -p from env vars.
case "$1" in
  display-message)
    fmt="$3"
    if [ "$fmt" = "#{pane_id}" ]; then
      echo "${STUB_PANE_ID:-%1}"
    elif [ "$fmt" = "#{pane_current_command}" ]; then
      echo "${STUB_PANE_CMD:-claude}"
    else
      echo "stub tmux: unknown display-message format: $fmt" >&2
      exit 1
    fi
    ;;
  send-keys)
    shift
    # Record each arg delimited by \x1f (unit separator) so args containing
    # spaces don't get confused with arg boundaries, one call per line.
    { printf '%s\x1f' "$@"; printf '\n'; } >> "$TMUX_STUB_LOG"
    ;;
  *)
    echo "stub tmux: unhandled tmux command: $*" >&2
    exit 1
    ;;
esac
EOF
  chmod +x "$STUB_DIR/tmux"
  export PATH="$STUB_DIR:$PATH"
  export TMUX_STUB_LOG="$TEST_TMP/send-keys.log"
  : > "$TMUX_STUB_LOG"
}

teardown() {
  rm -rf "$TEST_TMP"
}

us="$(printf '\x1f')"

# --- (a) refuse when pane_current_command isn't claude/node/bun ---
setup
export TMUX="/tmp/fake-tmux-socket,1234,0"
export STUB_PANE_CMD="bash"
export STUB_PANE_ID="%1"
out="$("$TARGET" 2>&1)"; rc=$?
assert_eq "(a) exits non-zero when pane is running bash" "1" "$rc"
assert_eq "(a) no send-keys logged when refusing" "" "$(cat "$TMUX_STUB_LOG")"
assert_contains "(a) stderr names the offending command" "$out" "bash"
teardown

# --- (b) two send-keys calls logged, no argument given ---
setup
export TMUX="/tmp/fake-tmux-socket,1234,0"
export STUB_PANE_CMD="claude"
export STUB_PANE_ID="%3"
out="$("$TARGET" 2>&1)"; rc=$?
assert_eq "(b) exits zero for a claude pane with no arg" "0" "$rc"
line_count="$(wc -l < "$TMUX_STUB_LOG" | tr -d ' ')"
assert_eq "(b) exactly two send-keys invocations logged" "2" "$line_count"
first_line="$(sed -n '1p' "$TMUX_STUB_LOG")"
second_line="$(sed -n '2p' "$TMUX_STUB_LOG")"
assert_eq "(b) first send-keys sends bare /compact literally" \
  "-t${us}%3${us}-l${us}--${us}/compact${us}" "$first_line"
assert_eq "(b) second send-keys sends Enter" \
  "-t${us}%3${us}Enter${us}" "$second_line"
teardown

# --- (c) instructions argument gets appended correctly ---
setup
export TMUX="/tmp/fake-tmux-socket,1234,0"
export STUB_PANE_CMD="claude"
export STUB_PANE_ID="%5"
out="$("$TARGET" "keep the API design decisions" 2>&1)"; rc=$?
assert_eq "(c) exits zero for a claude pane with an arg" "0" "$rc"
line_count="$(wc -l < "$TMUX_STUB_LOG" | tr -d ' ')"
assert_eq "(c) exactly two send-keys invocations logged" "2" "$line_count"
first_line="$(sed -n '1p' "$TMUX_STUB_LOG")"
second_line="$(sed -n '2p' "$TMUX_STUB_LOG")"
assert_eq "(c) first send-keys appends the instructions" \
  "-t${us}%5${us}-l${us}--${us}/compact keep the API design decisions${us}" "$first_line"
assert_eq "(c) second send-keys sends Enter" \
  "-t${us}%5${us}Enter${us}" "$second_line"
teardown

# --- (d) refuse when $TMUX is unset ---
setup
unset TMUX
export STUB_PANE_CMD="claude"
export STUB_PANE_ID="%1"
out="$("$TARGET" 2>&1)"; rc=$?
assert_eq "(d) exits non-zero when not in tmux" "1" "$rc"
assert_eq "(d) no send-keys logged when not in tmux" "" "$(cat "$TMUX_STUB_LOG")"
teardown

echo
echo "$pass_count passed, $fail_count failed"
[ "$fail_count" -eq 0 ]
