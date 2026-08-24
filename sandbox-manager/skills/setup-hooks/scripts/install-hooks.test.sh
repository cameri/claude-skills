#!/usr/bin/env bash
# Tests for install-hooks.py's --disable/--enable flags: they manage a
# sibling `<name>.py.disabled` sentinel file in --hooks-dir, independent of
# whether that hook is currently installed/registered.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$SCRIPT_DIR/install-hooks.py"

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
  HOOKS_DIR="$TEST_TMP/hooks"
  mkdir -p "$HOOKS_DIR"
}
teardown() { rm -rf "$TEST_TMP"; }

# --- (a) --disable creates the sentinel file ---
setup
python3 "$TARGET" --hooks-dir "$HOOKS_DIR" --disable session-start-notify >/dev/null
assert_eq "(a) --disable creates the sentinel" "yes" "$([ -f "$HOOKS_DIR/session-start-notify.py.disabled" ] && echo yes || echo no)"
teardown

# --- (b) --enable removes an existing sentinel ---
setup
touch "$HOOKS_DIR/session-start-notify.py.disabled"
python3 "$TARGET" --hooks-dir "$HOOKS_DIR" --enable session-start-notify >/dev/null
assert_eq "(b) --enable removes the sentinel" "no" "$([ -f "$HOOKS_DIR/session-start-notify.py.disabled" ] && echo yes || echo no)"
teardown

# --- (c) --enable on an already-enabled (no sentinel) hook is a no-op, exit 0 ---
setup
python3 "$TARGET" --hooks-dir "$HOOKS_DIR" --enable session-start-notify >/dev/null
rc=$?
assert_eq "(c) --enable with no sentinel present exits 0" "0" "$rc"
teardown

# --- (d) --disable rejects an unknown hook name ---
setup
python3 "$TARGET" --hooks-dir "$HOOKS_DIR" --disable not-a-real-hook >/dev/null 2>&1
rc=$?
assert_eq "(d) --disable rejects an unknown hook name" "2" "$rc"
teardown

# --- (e) neither --hook, --disable, nor --enable given -> usage error ---
setup
python3 "$TARGET" --hooks-dir "$HOOKS_DIR" >/dev/null 2>&1
rc=$?
assert_eq "(e) no action given exits non-zero" "1" "$rc"
teardown

echo
echo "$pass_count passed, $fail_count failed"
[ "$fail_count" -eq 0 ]
