#!/usr/bin/env bash
# Tests for session-start-notify.py's build_notification_text, the pure
# function that decides what (if anything) to send for a given SessionStart
# source. The actual Telegram POST is left untested, matching this repo's
# convention of testing pure logic and leaving network/side-effect glue.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$SCRIPT_DIR/session-start-notify.py"

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

# Calls build_notification_text(source, session_id, registry_dir) via the
# target script's module namespace, printing "None" for a None result.
# session_id "" means Python None (matches payload.get("session_id") when
# the field is absent).
call() {
  local source="$1" session_id="$2" registry_dir="$3"
  python3 -c "
import importlib.util, sys
spec = importlib.util.spec_from_file_location('notify', sys.argv[4])
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
session_id = sys.argv[2] or None
result = m.build_notification_text(sys.argv[1], session_id, sys.argv[3])
print(result if result is not None else 'None')
" "$source" "$session_id" "$registry_dir" "$TARGET"
}

setup() {
  TEST_TMP="$(mktemp -d)"
  REGISTRY_DIR="$TEST_TMP/sessions"
  mkdir -p "$REGISTRY_DIR"
}
teardown() { rm -rf "$TEST_TMP"; }

# --- (a) startup source sends the plain message ---
setup
actual="$(call "startup" "" "$REGISTRY_DIR")"
assert_eq "(a) startup sends the plain message" "Session started (source: startup)." "$actual"
teardown

# --- (b) compact source sends nothing ---
setup
actual="$(call "compact" "" "$REGISTRY_DIR")"
assert_eq "(b) compact sends nothing" "None" "$actual"
teardown

# --- (c) resume with a named session in the registry ---
setup
echo '{"sessionId":"abc-123","name":"workspace-0e"}' > "$REGISTRY_DIR/11.json"
actual="$(call "resume" "abc-123" "$REGISTRY_DIR")"
assert_eq "(c) resume resolves the session's registry name" "Resumed session: workspace-0e." "$actual"
teardown

# --- (d) resume with no matching registry entry falls back to a short id ---
setup
actual="$(call "resume" "deadbeef-0000-0000-0000-000000000000" "$REGISTRY_DIR")"
assert_eq "(d) resume falls back to the short session id" "Resumed session: deadbeef." "$actual"
teardown

echo
echo "$pass_count passed, $fail_count failed"
[ "$fail_count" -eq 0 ]
