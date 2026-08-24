#!/usr/bin/env bash
# Tests for ssh-pubkey-check.py against a real, disposable ed25519 keypair
# (ssh-keygen itself is deterministic and side-effect-free on a scratch
# dir, so there's no need to stub it out).
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$SCRIPT_DIR/ssh-pubkey-check.py"

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
    *"$needle"*) pass_count=$((pass_count + 1)); echo "ok - $desc" ;;
    *) fail_count=$((fail_count + 1))
       echo "not ok - $desc"; echo "    expected to contain: $needle"; echo "    actual: $haystack" ;;
  esac
}

setup() {
  TEST_TMP="$(mktemp -d)"
  PRIV="$TEST_TMP/id_ed25519"
  PUB="$TEST_TMP/id_ed25519.pub"
  ssh-keygen -t ed25519 -N "" -C "test" -f "$PRIV" >/dev/null 2>&1
  export SSH_PUBKEY_CHECK_PRIVATE_KEY="$PRIV"
  export SSH_PUBKEY_CHECK_PUBLIC_KEY="$PUB"
}
teardown() { rm -rf "$TEST_TMP"; unset SSH_PUBKEY_CHECK_PRIVATE_KEY SSH_PUBKEY_CHECK_PUBLIC_KEY; }

# --- (a) both keys present -> no-op ---
setup
out="$(echo '{}' | python3 "$TARGET")"
assert_eq "(a) no-op when both keys already present" "{}" "$out"
teardown

# --- (b) private key missing entirely -> no-op (nothing to derive from) ---
setup
rm -f "$PRIV" "$PRIV.pub" "$PUB"
out="$(echo '{}' | python3 "$TARGET")"
assert_eq "(b) no-op when the private key is also missing" "{}" "$out"
teardown

# --- (c) pub missing, priv present -> regenerates the exact original pubkey ---
setup
original_pub="$(cat "$PUB")"
rm -f "$PUB"
out="$(echo '{}' | python3 "$TARGET")"
assert_contains "(c) reports the fix in additionalContext" "$out" "regenerated it"
regenerated_pub="$(cat "$PUB" 2>/dev/null || echo MISSING)"
assert_eq "(c) regenerated key is byte-identical to the original" "$original_pub" "$regenerated_pub"
perms="$(stat -c '%a' "$PUB" 2>/dev/null || stat -f '%Lp' "$PUB")"
assert_eq "(c) regenerated key is 0644" "644" "$perms"
teardown

# --- (d) a .disabled sentinel makes main() no-op entirely, even if pub is missing ---
setup
rm -f "$PUB"
touch "$TARGET.disabled"
out="$(echo '{}' | python3 "$TARGET")"
rm -f "$TARGET.disabled"
assert_eq "(d) sentinel file makes main() print {}" "{}" "$out"
assert_eq "(d) sentinel file means no regeneration happens" "1" "$([ -f "$PUB" ] && echo 0 || echo 1)"
teardown

echo
echo "$pass_count passed, $fail_count failed"
[ "$fail_count" -eq 0 ]
