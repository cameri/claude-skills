---
name: verify-event
description: Verify a Nostr event — check schema validity, ID hash, and Schnorr signature. Use when the user wants to validate a Nostr event, check if an event is authentic, or debug a malformed event.
---

<objective>
Verify a Nostr event against the NIP-01 specification: schema shape, ID hash, and Schnorr signature.
</objective>

<process>
Given a Nostr event JSON object, run all three checks in order and report pass/fail for each.

## Step 1 — Schema check

A valid event must have exactly these fields with the correct types:

```
id          string   64-char lowercase hex
pubkey      string   64-char lowercase hex
created_at  number   Unix timestamp (integer)
kind        number   integer 0–65535
tags        array    array of arrays of strings
content     string   any string
sig         string   128-char lowercase hex
```

Fail if any field is missing, has the wrong type, or `id`/`pubkey`/`sig` are not valid hex strings of the correct length.

## Step 2 — ID hash check

The event ID is the SHA-256 hash of the serialized event. Recompute it and compare.

Serialization (NIP-01):
```json
[0, "<pubkey>", <created_at>, <kind>, <tags>, "<content>"]
```

Compute: `SHA-256(UTF-8(JSON.stringify(serialized_array)))` → 64-char hex

Use this script:

```bash
python3 - <<'EOF'
import json, hashlib, sys

event = json.loads(sys.stdin.read())
serial = json.dumps(
    [0, event["pubkey"], event["created_at"], event["kind"], event["tags"], event["content"]],
    separators=(",", ":"),
    ensure_ascii=False
)
computed = hashlib.sha256(serial.encode("utf-8")).hexdigest()
claimed  = event["id"]
print(f"Computed: {computed}")
print(f"Claimed:  {claimed}")
print("PASS" if computed == claimed else "FAIL — ID mismatch")
EOF
```
Pipe the event JSON to stdin.

## Step 3 — Signature check

The signature is a Schnorr signature over the event ID (32-byte hash), using the pubkey.

Use nostr-tools in Bun (most reliable in this environment):

```bash
cat > /tmp/verify_sig.ts <<'EOF'
import { verifyEvent } from "nostr-tools"
const event = JSON.parse(process.argv[2])
const ok = verifyEvent(event)
console.log(ok ? "PASS" : "FAIL — invalid signature")
EOF
bun /tmp/verify_sig.ts '<event-json>'
```

Or with Python using the `coincurve` or `cryptography` library if available:

```python
# schnorr verification via secp256k1
# event.id is the message (32-byte hash), event.sig is 64-byte signature, event.pubkey is 32-byte x-only pubkey
```

If neither is available, note that signature verification requires secp256k1 Schnorr support and suggest using nostr-tools.

## Reporting

Present a clear summary:

```
Event ID: <first 16 chars>...

✓ Schema    — all required fields present and correctly typed
✓ ID hash   — SHA-256 matches event.id
✓ Signature — Schnorr signature valid

Event is VALID
```

Or with failures:

```
✗ ID hash   — computed abc123... but event.id is def456...
✗ Signature — invalid

Event is INVALID
```
</process>

<reference>
## NIP-01 Event Structure

```json
{
  "id":         "<32-byte sha256 of serialized event, hex>",
  "pubkey":     "<32-byte secp256k1 public key, hex>",
  "created_at": <unix timestamp in seconds>,
  "kind":       <integer>,
  "tags":       [["e", "<event-id>"], ["p", "<pubkey>"], ...],
  "content":    "<arbitrary string>",
  "sig":        "<64-byte Schnorr signature of sha256(serialized event), hex>"
}
```

Serialization format (strict — no spaces, Unicode-safe):
```
[0, pubkey, created_at, kind, tags, content]
```

Common failure modes:
- `id` was computed with extra spaces in JSON serialization
- `content` contains unescaped Unicode that differs between serializations
- Tags contain non-string elements
- `created_at` is a float instead of integer
</reference>

<success_criteria>
All three checks (schema, hash, signature) report pass or fail with a clear explanation of any mismatch.
</success_criteria>
