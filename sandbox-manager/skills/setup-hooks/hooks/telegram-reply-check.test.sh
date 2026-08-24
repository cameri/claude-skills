#!/usr/bin/env bash
# Tests for telegram-reply-check.py, feeding synthetic transcript JSONL files
# and asserting on the hook's JSON decision output.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$SCRIPT_DIR/telegram-reply-check.py"

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

# Writes the given JSONL lines to a fresh transcript file, runs the hook with
# a payload pointing at it, and echoes the "decision" field ("" if absent).
run_hook() {
  local transcript="$TEST_TMP/transcript.jsonl"
  printf '%s\n' "$@" > "$transcript"
  local payload
  payload="$(python3 -c 'import json,sys; print(json.dumps({"transcript_path": sys.argv[1]}))' "$transcript")"
  local out
  out="$(echo "$payload" | python3 "$TARGET")"
  python3 -c 'import json,sys; print(json.loads(sys.stdin.read()).get("decision",""))' <<< "$out"
}

setup() { TEST_TMP="$(mktemp -d)"; }
teardown() { rm -rf "$TEST_TMP"; }

REGULAR_MSG='{"type":"user","message":{"content":"<channel source=\"plugin:telegram-ng:telegram\" chat_id=\"1\" message_id=\"1\" user=\"cameri\" user_id=\"1\" ts=\"2026-08-17T00:00:00Z\">hello</channel>"}}'
POLL_MSG='{"type":"user","message":{"content":"<channel source=\"plugin:telegram-ng:telegram\" chat_id=\"1\" user=\"cameri\" user_id=\"1\" poll_id=\"123\">voted for: Yes</channel>"}}'
REPLY_CALL='{"type":"assistant","message":{"content":[{"type":"tool_use","name":"mcp__plugin_telegram-ng_telegram__reply","input":{}}]}}'

# --- (a) regular message with no reply since -> blocks (unaffected baseline) ---
setup
decision="$(run_hook "$REGULAR_MSG")"
assert_eq "(a) regular message with no reply blocks" "block" "$decision"
teardown

# --- (b) regular message followed by a reply call -> no block (unaffected baseline) ---
setup
decision="$(run_hook "$REGULAR_MSG" "$REPLY_CALL")"
assert_eq "(b) regular message followed by reply does not block" "" "$decision"
teardown

# --- (c) poll_answer notification with no reply -> does NOT block (new behavior) ---
setup
decision="$(run_hook "$POLL_MSG")"
assert_eq "(c) poll_answer notification alone does not block" "" "$decision"
teardown

# --- (d) poll_answer followed by a regular message with no reply -> blocks ---
setup
decision="$(run_hook "$POLL_MSG" "$REGULAR_MSG")"
assert_eq "(d) a later regular message still requires its own reply" "block" "$decision"
teardown

# --- (e) a .disabled sentinel suppresses the (a) block scenario ---
setup
touch "$TARGET.disabled"
decision="$(run_hook "$REGULAR_MSG")"
rm -f "$TARGET.disabled"
assert_eq "(e) sentinel file suppresses the block" "" "$decision"
teardown

echo
echo "$pass_count passed, $fail_count failed"
[ "$fail_count" -eq 0 ]
