#!/usr/bin/env bash
# Tests for rename-session.sh, using stub tmux/herdr executables on PATH.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$SCRIPT_DIR/rename-session.sh"

pass_count=0
fail_count=0

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    pass_count=$((pass_count + 1)); echo "ok - $desc"
  else
    fail_count=$((fail_count + 1))
    echo "not ok - $desc"; echo "    expected: $expected"; echo "    actual:   $actual"
  fi
}

assert_contains() {
  local desc="$1" haystack="$2" needle="$3"
  case "$haystack" in
    *"$needle"*) pass_count=$((pass_count + 1)); echo "ok - $desc" ;;
    *) fail_count=$((fail_count + 1))
       echo "not ok - $desc"; echo "    expected to contain: $needle"; echo "    actual: $haystack" ;;
  esac
}

setup() {
  TEST_TMP="$(mktemp -d)"
  STUB_DIR="$TEST_TMP/bin"
  mkdir -p "$STUB_DIR"
  cat > "$STUB_DIR/tmux" <<'EOF'
#!/usr/bin/env bash
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
    { printf '%s\x1f' "$@"; printf '\n'; } >> "$TMUX_STUB_LOG"
    ;;
  *) echo "stub tmux: unhandled tmux command: $*" >&2; exit 1 ;;
esac
EOF
  chmod +x "$STUB_DIR/tmux"
  cat > "$STUB_DIR/herdr" <<'EOF'
#!/usr/bin/env bash
case "$1" in
  pane)
    case "$2" in
      process-info)
        cat <<JSON
{"result":{"process_info":{"foreground_processes":[{"argv":["${STUB_PANE_ARGV0:-claude}"],"name":"MainThread"}]}}}
JSON
        ;;
      run)
        shift 2
        { printf '%s\x1f' "$@"; printf '\n'; } >> "$HERDR_STUB_LOG"
        ;;
      *) echo "stub herdr: unhandled pane subcommand: $*" >&2; exit 1 ;;
    esac
    ;;
  *) echo "stub herdr: unhandled command: $*" >&2; exit 1 ;;
esac
EOF
  chmod +x "$STUB_DIR/herdr"
  export PATH="$STUB_DIR:$PATH"
  export TMUX_STUB_LOG="$TEST_TMP/send-keys.log"
  export HERDR_STUB_LOG="$TEST_TMP/pane-run.log"
  : > "$TMUX_STUB_LOG"
  : > "$HERDR_STUB_LOG"
  unset TMUX HERDR_ENV HERDR_PANE_ID
}

teardown() { rm -rf "$TEST_TMP"; }

us="$(printf '\x1f')"

setup
out="$("$TARGET" "my-session" 2>&1)"; rc=$?
assert_eq "(a) exits non-zero when not in tmux or herdr" "1" "$rc"
teardown

setup
export TMUX="/tmp/fake,1,0"
out="$("$TARGET" 2>&1)"; rc=$?
assert_eq "(b) exits non-zero with no argument" "1" "$rc"
assert_contains "(b) stderr shows usage" "$out" "Usage:"
teardown

setup
export TMUX="/tmp/fake,1,0"
export STUB_PANE_CMD="claude"
export STUB_PANE_ID="%5"
out="$("$TARGET" "my-session" 2>&1)"; rc=$?
assert_eq "(c) exits zero for a claude pane with an arg" "0" "$rc"
line_count="$(wc -l < "$TMUX_STUB_LOG" | tr -d ' ')"
assert_eq "(c) exactly two send-keys invocations logged" "2" "$line_count"
assert_eq "(c) sends /rename with the name literally" \
  "-t${us}%5${us}-l${us}--${us}/rename my-session${us}" "$(sed -n '1p' "$TMUX_STUB_LOG")"
assert_eq "(c) sends Enter" "-t${us}%5${us}Enter${us}" "$(sed -n '2p' "$TMUX_STUB_LOG")"
teardown

setup
export HERDR_ENV=1
export HERDR_PANE_ID="w1:p1"
export STUB_PANE_ARGV0="claude"
out="$("$TARGET" "my-session" 2>&1)"; rc=$?
assert_eq "(d) exits zero for a claude pane with an arg, herdr mode" "0" "$rc"
line_count="$(wc -l < "$HERDR_STUB_LOG" | tr -d ' ')"
assert_eq "(d) exactly one pane-run invocation logged" "1" "$line_count"
assert_eq "(d) pane-run sends pane id and /rename with the name" \
  "w1:p1${us}/rename my-session${us}" "$(sed -n '1p' "$HERDR_STUB_LOG")"
teardown

echo
echo "$pass_count passed, $fail_count failed"
[ "$fail_count" -eq 0 ]
