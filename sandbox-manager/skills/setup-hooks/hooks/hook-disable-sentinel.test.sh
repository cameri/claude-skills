#!/usr/bin/env bash
# Cross-cutting test: every bundled hook script (except statusline-wrapper,
# which isn't invoked through this event-hook protocol) must no-op with
# `{}` on stdout and exit 0 when a sibling `<script>.disabled` sentinel
# file exists, regardless of what's on stdin. Lets setup-hooks re-copy a
# script on a future run without reinstating a hook someone explicitly
# disabled (the sentinel file isn't touched by install-hooks.py's copy).
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

HOOKS=(
  destructive-var-guard
  telegram-reply-check
  usage-alert
  idle-state-tracker
  whats-next-check
  session-start-notify
  pay-invoice-guard
  plugin-version-check
  claude-subcommand-guard
)

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
}
teardown() { rm -rf "$TEST_TMP"; }

for name in "${HOOKS[@]}"; do
  setup
  copy="$TEST_TMP/$name.py"
  cp "$SCRIPT_DIR/$name.py" "$copy"
  touch "$copy.disabled"

  out="$(echo '{}' | python3 "$copy" 2>"$TEST_TMP/stderr")"
  rc=$?

  assert_eq "$name: exits 0 when disabled" "0" "$rc"
  assert_eq "$name: prints {} when disabled" "{}" "$out"
  assert_eq "$name: no stderr when disabled" "" "$(cat "$TEST_TMP/stderr")"
  teardown
done

echo
echo "$pass_count passed, $fail_count failed"
[ "$fail_count" -eq 0 ]
