#!/usr/bin/env bash
# Tests for pane-io.sh: multiplexer detection and the three pane primitives,
# exercised against stub tmux/herdr executables placed on PATH (same pattern
# as compact-session.test.sh).
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB="$SCRIPT_DIR/pane-io.sh"

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
  *)
    echo "stub tmux: unhandled tmux command: $*" >&2
    exit 1
    ;;
esac
EOF
  chmod +x "$STUB_DIR/tmux"

  cat > "$STUB_DIR/herdr" <<'EOF'
#!/usr/bin/env bash
case "$1" in
  pane)
    case "$2" in
      process-info)
        # args: process-info --pane <id>
        cat <<JSON
{"result":{"process_info":{"foreground_processes":[{"argv":["${STUB_PANE_ARGV0:-claude}"],"name":"MainThread"}]}}}
JSON
        ;;
      run)
        shift 2
        { printf '%s\x1f' "$@"; printf '\n'; } >> "$HERDR_STUB_LOG"
        ;;
      *)
        echo "stub herdr: unhandled pane subcommand: $*" >&2
        exit 1
        ;;
    esac
    ;;
  *)
    echo "stub herdr: unhandled command: $*" >&2
    exit 1
    ;;
esac
EOF
  chmod +x "$STUB_DIR/herdr"

  export PATH="$STUB_DIR:$PATH"
  export TMUX_STUB_LOG="$TEST_TMP/tmux-send-keys.log"
  export HERDR_STUB_LOG="$TEST_TMP/herdr-pane-run.log"
  : > "$TMUX_STUB_LOG"
  : > "$HERDR_STUB_LOG"
  unset TMUX HERDR_ENV HERDR_PANE_ID
}

teardown() {
  rm -rf "$TEST_TMP"
}

us="$(printf '\x1f')"

# --- pane_io_active ---
setup
assert_eq "active: neither set -> empty" "" "$(bash -c "source '$LIB'; pane_io_active")"
teardown

setup
export TMUX="/tmp/fake,1,0"
assert_eq "active: TMUX set -> tmux" "tmux" "$(bash -c "source '$LIB'; pane_io_active")"
teardown

setup
export HERDR_ENV=1
assert_eq "active: HERDR_ENV set -> herdr" "herdr" "$(bash -c "source '$LIB'; pane_io_active")"
teardown

# --- pane_io_current_id ---
setup
export TMUX="/tmp/fake,1,0"
export STUB_PANE_ID="%7"
assert_eq "current_id: tmux mode reads display-message" "%7" \
  "$(bash -c "source '$LIB'; pane_io_current_id")"
teardown

setup
export HERDR_ENV=1
export HERDR_PANE_ID="w1:p1"
assert_eq "current_id: herdr mode reads \$HERDR_PANE_ID directly" "w1:p1" \
  "$(bash -c "source '$LIB'; pane_io_current_id")"
teardown

setup
rc=0
bash -c "source '$LIB'; pane_io_current_id" >/dev/null 2>&1 || rc=$?
assert_eq "current_id: neither active -> exit 1" "1" "$rc"
teardown

# --- pane_io_current_cmd ---
setup
export TMUX="/tmp/fake,1,0"
export STUB_PANE_CMD="claude"
assert_eq "current_cmd: tmux mode reads display-message" "claude" \
  "$(bash -c "source '$LIB'; pane_io_current_cmd '%1'")"
teardown

setup
export HERDR_ENV=1
export STUB_PANE_ARGV0="node"
assert_eq "current_cmd: herdr mode uses argv[0], not the unreliable name field" "node" \
  "$(bash -c "source '$LIB'; pane_io_current_cmd 'w1:p1'")"
teardown

setup
export HERDR_ENV=1
export STUB_PANE_ARGV0="/usr/local/bin/node"
assert_eq "current_cmd: herdr mode basenames a full path correctly" "node" \
  "$(bash -c "source '$LIB'; pane_io_current_cmd 'w1:p1'")"
teardown

# --- pane_io_send ---
setup
export TMUX="/tmp/fake,1,0"
bash -c "source '$LIB'; pane_io_send '%3' '/clear'"
line_count="$(wc -l < "$TMUX_STUB_LOG" | tr -d ' ')"
assert_eq "send: tmux mode makes two send-keys calls" "2" "$line_count"
first_line="$(sed -n '1p' "$TMUX_STUB_LOG")"
second_line="$(sed -n '2p' "$TMUX_STUB_LOG")"
assert_eq "send: tmux first call is literal text" "-t${us}%3${us}-l${us}--${us}/clear${us}" "$first_line"
assert_eq "send: tmux second call is Enter" "-t${us}%3${us}Enter${us}" "$second_line"
teardown

setup
export HERDR_ENV=1
bash -c "source '$LIB'; pane_io_send 'w1:p1' '/clear'"
line_count="$(wc -l < "$HERDR_STUB_LOG" | tr -d ' ')"
assert_eq "send: herdr mode makes one pane run call" "1" "$line_count"
assert_eq "send: herdr call has pane id and text" "w1:p1${us}/clear${us}" \
  "$(sed -n '1p' "$HERDR_STUB_LOG")"
teardown

echo
echo "$pass_count passed, $fail_count failed"
[ "$fail_count" -eq 0 ]
