#!/usr/bin/env bash
# Shared test scaffolding for sandbox-manager's session-control test suites:
# assert helpers, plus a setup()/teardown() pair that stands up stub
# tmux/herdr executables on PATH so scripts built on pane-io.sh can be
# tested without a real multiplexer. Source this, don't copy it — every
# session-control *.test.sh used to hand-roll its own byte-identical copy
# of this block.
#
# Provides: assert_eq, assert_contains, setup, teardown, and $us (the unit
# separator used to disambiguate argv boundaries in the stub logs).
#
# Callers still own pass_count/fail_count (initialize both to 0 before the
# first assertion) and their own SCRIPT_DIR/TARGET.

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
      send-text)
        shift 2
        { printf '%s\x1f' "$@"; printf '\n'; } >> "$HERDR_STUB_LOG"
        ;;
      send-keys)
        shift 2
        { printf '%s\x1f' "$@"; printf '\n'; } >> "$HERDR_STUB_LOG"
        ;;
      *) echo "stub herdr: unhandled pane subcommand: $*" >&2; exit 1 ;;
    esac
    ;;
  agent)
    case "$2" in
      prompt)
        shift 2
        { printf '%s\x1f' "$@"; printf '\n'; } >> "$HERDR_STUB_LOG"
        ;;
      *) echo "stub herdr: unhandled agent subcommand: $*" >&2; exit 1 ;;
    esac
    ;;
  session)
    case "$2" in
      stop)
        echo "$3" >> "$HERDR_SESSION_STOP_LOG"
        ;;
      *) echo "stub herdr: unhandled session subcommand: $*" >&2; exit 1 ;;
    esac
    ;;
  *) echo "stub herdr: unhandled command: $*" >&2; exit 1 ;;
esac
EOF
  chmod +x "$STUB_DIR/herdr"
  export PATH="$STUB_DIR:$PATH"
  export TMUX_STUB_LOG="$TEST_TMP/send-keys.log"
  export HERDR_STUB_LOG="$TEST_TMP/pane-run.log"
  export HERDR_SESSION_STOP_LOG="$TEST_TMP/session-stop.log"
  : > "$TMUX_STUB_LOG"
  : > "$HERDR_STUB_LOG"
  : > "$HERDR_SESSION_STOP_LOG"
  unset TMUX HERDR_ENV HERDR_PANE_ID HERDR_SESSION
}

teardown() { rm -rf "$TEST_TMP"; }

us="$(printf '\x1f')"
