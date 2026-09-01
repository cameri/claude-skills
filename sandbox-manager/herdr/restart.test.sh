#!/usr/bin/env bash
# Tests for restart.sh, the omp-respawn pane.exited hook. Uses a purpose-built
# stub HERDR_BIN_PATH that simulates the workspace_not_found race (the exited
# pane's workspace is closed by herdr's auto-close cascade before the hook
# runs) and the workspace-create fallback.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$SCRIPT_DIR/restart.sh"

pass_count=0
fail_count=0

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    pass_count=$((pass_count + 1))
  else
    echo "FAIL: $desc — expected [$expected], got [$actual]" >&2
    fail_count=$((fail_count + 1))
  fi
}

setup() {
  TEST_TMP="$(mktemp -d)"
  export HERDR_PLUGIN_STATE_DIR="$TEST_TMP/state"
  export HERDR_PLUGIN_CONFIG_DIR="$TEST_TMP/config"
  export HERDR_PLUGIN_EVENT_JSON='{"event":"pane_exited","data":{"pane_id":"wX:p1","workspace_id":"w8"}}'
  STUB_DIR="$TEST_TMP/bin"
  mkdir -p "$STUB_DIR"
  export HERDR_BIN_PATH="$STUB_DIR/herdr"
  export STUB_CALLS="$TEST_TMP/calls.log"
  export STUB_MARKER="$TEST_TMP/open-ok.marker"
  unset STUB_ERR
  : > "$STUB_CALLS"
  cat > "$STUB_DIR/herdr" <<'EOF'
#!/usr/bin/env bash
# stub herdr: pane open fails with workspace_not_found until the marker
# exists (workspace create touches it); workspace create returns a new id.
case "$1" in
  plugin)
    [ "$2" = "pane" ] && [ "$3" = "open" ] || { echo "stub: unhandled $*" >&2; exit 1; }
    shift 3
    ws=""
    while [ "$#" -gt 0 ]; do
      if [ "$1" = "--workspace" ]; then ws="$2"; shift 2; else shift; fi
    done
    echo "open:$ws" >> "$STUB_CALLS"
    if [ -f "$STUB_MARKER" ]; then
      printf '{"id":"cli:plugin","result":{"type":"plugin.pane.open","ok":true}}\n'
      exit 0
    fi
    if [ "${STUB_ERR:-not_found}" = "other" ]; then
      printf '{"error":{"code":"plugin_disabled","message":"nope"},"id":"cli:plugin"}\n'
    else
      printf '{"error":{"code":"workspace_not_found","message":"workspace %s not found"},"id":"cli:plugin"}\n' "$ws"
    fi
    exit 1
    ;;
  workspace)
    shift
    case "$1" in
      create)
        shift
        echo "create:$*" >> "$STUB_CALLS"
        touch "$STUB_MARKER"
        printf '{"id":"cli:workspace:create","result":{"workspace":{"workspace_id":"wNEW"},"root_pane":{"pane_id":"proot"}}}\n'
        ;;
      focus)
        echo "focus:$2" >> "$STUB_CALLS"
        ;;
      *) echo "stub: unhandled workspace $*" >&2; exit 1 ;;
    esac
    ;;
  pane)
    shift
    case "$1" in
      close)
        echo "close:$2" >> "$STUB_CALLS"
        ;;
      *) echo "stub: unhandled pane $*" >&2; exit 1 ;;
    esac
    ;;
  *) echo "stub: unhandled $*" >&2; exit 1 ;;
esac
EOF
  chmod +x "$STUB_DIR/herdr"
}
teardown() { rm -rf "$TEST_TMP"; }

calls() { cat "$STUB_CALLS" 2>/dev/null || true; }

# --- (a) fast path: workspace still exists, pane open succeeds ---
setup
touch "$STUB_MARKER"
"$TARGET"; rc=$?
assert_eq "(a) exits zero when reopen succeeds" "0" "$rc"
assert_eq "(a) only the pane open call" "open:w8" "$(calls)"
teardown

# --- (b) recreate path: workspace closed by cascade, recreate then reopen ---
setup
"$TARGET"; rc=$?
assert_eq "(b) exits zero after recreate" "0" "$rc"
assert_eq "(b) open, create, open, close shell, focus sequence" "open:w8
create:--cwd /workspace --label omp --no-focus
open:wNEW
close:proot
focus:wNEW" "$(calls)"
grep -q "recreating" "$HERDR_PLUGIN_STATE_DIR/restart.log"
assert_eq "(b) logs the recreate reason" "0" "$?"
teardown

# --- (c) respawn.env overrides the recreated workspace identity ---
setup
mkdir -p "$HERDR_PLUGIN_CONFIG_DIR"
cat > "$HERDR_PLUGIN_CONFIG_DIR/respawn.env" <<'EOF'
WS_CWD=/srv/omp
WS_LABEL=main
EOF
"$TARGET"; rc=$?
assert_eq "(c) exits zero after recreate" "0" "$rc"
assert_eq "(c) create honors respawn.env" "open:w8
create:--cwd /srv/omp --label main --no-focus
open:wNEW
close:proot
focus:wNEW" "$(calls)"
teardown

# --- (d) no workspace_id in the event envelope: skip ---
setup
export HERDR_PLUGIN_EVENT_JSON='{"event":"pane_exited","data":{"pane_id":"wX:p1"}}'
"$TARGET"; rc=$?
assert_eq "(d) exits non-zero without workspace_id" "1" "$rc"
assert_eq "(d) no herdr calls without workspace_id" "" "$(calls)"
teardown

# --- (e) stop marker: keep omp down, no calls ---
setup
mkdir -p "$HERDR_PLUGIN_STATE_DIR"
touch "$HERDR_PLUGIN_STATE_DIR/stop"
"$TARGET"; rc=$?
assert_eq "(e) exits zero with stop marker" "0" "$rc"
assert_eq "(e) no herdr calls with stop marker" "" "$(calls)"
teardown

# --- (f) pane open fails for a non-workspace reason: no recreate ---
setup
export STUB_ERR=other
"$TARGET"; rc=$?
assert_eq "(f) exits non-zero on unrelated pane open error" "1" "$rc"
assert_eq "(f) no recreate on unrelated error" "open:w8" "$(calls)"
teardown

echo
echo "$pass_count passed, $fail_count failed"
[ "$fail_count" -eq 0 ]
