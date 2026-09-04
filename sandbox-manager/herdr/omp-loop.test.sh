#!/usr/bin/env bash
# Tests for omp-loop.sh, the self-restarting omp pane wrapper. Runs the real
# script against fake launch commands in a temp state dir; asserts behavior
# via the wrapper's own log.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$SCRIPT_DIR/omp-loop.sh"

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
  export OMP_LOOP_STATE_DIR="$TEST_TMP/state"
  unset HERDR_PLUGIN_STATE_DIR HERDR_PLUGIN_CONFIG_DIR
  FAKE="$TEST_TMP/fake-exit"
  cat > "$FAKE" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
  chmod +x "$FAKE"
}
teardown() { rm -rf "$TEST_TMP"; }

logfile() { echo "$OMP_LOOP_STATE_DIR/omp-loop.log"; }
starts() {
  local c
  c="$(grep -c 'starting omp:' "$(logfile)" 2>/dev/null)"
  echo "${c:-0}"
}

# --- (a) stop marker: exits immediately, launches nothing ---
setup
mkdir -p "$OMP_LOOP_STATE_DIR"
touch "$OMP_LOOP_STATE_DIR/stop"
"$TARGET" -- "$FAKE" >/dev/null 2>&1; rc=$?
assert_eq "(a) exits zero when stop marker present" "0" "$rc"
assert_eq "(a) no launches when stop marker present" "0" "$(starts)"
stop_lines="$(grep -c 'stop marker present' "$(logfile)")"
assert_eq "(a) logs the stop-marker reason" "1" "$stop_lines"
teardown

# --- (b) clean exit: no relaunch, stop marker written, wrapper exits 0 ---
setup
timeout 6s "$TARGET" -- "$FAKE" >/dev/null 2>&1; rc=$?
assert_eq "(b) no relaunch after clean exit" "1" "$(starts)"
assert_eq "(b) wrapper exits zero after clean exit" "0" "$rc"
[ -f "$OMP_LOOP_STATE_DIR/stop" ]
assert_eq "(b) stop marker written after clean exit" "0" "$?"
teardown

# --- (b2) signal death: wrapper relaunches ---
setup
cat > "$FAKE" <<'EOF'
#!/usr/bin/env bash
kill -9 "$$"
EOF
chmod +x "$FAKE"
timeout 6s "$TARGET" -- "$FAKE" >/dev/null 2>&1
n="$(starts)"
[ "$n" -ge 2 ]
assert_eq "(b2) relaunches after signal death (>=2 starts, got $n)" "0" "$?"
teardown

# --- (c) crash-loop guard: rapid signal deaths engage the backoff ---
setup
cat > "$FAKE" <<'EOF'
#!/usr/bin/env bash
kill -9 "$$"
EOF
chmod +x "$FAKE"
OMP_LOOP_BACKOFF=1 timeout 8s "$TARGET" -- "$FAKE" >/dev/null 2>&1
n="$(grep -c 'backing off' "$(logfile)" 2>/dev/null || echo 0)"
[ "$n" -ge 1 ]
assert_eq "(c) rapid crashes trigger backoff (>=1 backoff, got $n)" "0" "$?"
teardown

# --- (d) default args: no args -> omp --cwd /workspace --auto-approve ---
setup
STUB_DIR="$TEST_TMP/stubbin"
mkdir -p "$STUB_DIR"
cat > "$STUB_DIR/omp" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$STUB_DIR/omp"
PATH="$STUB_DIR:$PATH" timeout 4s "$TARGET" >/dev/null 2>&1
[ "$(grep -c 'starting omp: omp --cwd /workspace --auto-approve' "$(logfile)" 2>/dev/null || echo 0)" -ge 1 ]
assert_eq "(d) launches default omp args" "0" "$?"
teardown

echo
echo "$pass_count passed, $fail_count failed"
[ "$fail_count" -eq 0 ]
