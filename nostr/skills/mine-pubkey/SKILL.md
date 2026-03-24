---
name: mine-pubkey
description: Mine a Nostr keypair with a vanity pubkey prefix or target difficulty using rana. Use when the user wants to generate a Nostr public key that starts with specific hex characters, a specific npub prefix/suffix, or meets a minimum proof-of-work difficulty. Requires rana installed in PATH.
---

<objective>
Start a background rana mining job to generate a Nostr keypair matching the user's vanity or difficulty target, then monitor and report the result.
</objective>

<essential_principles>
- Always run rana in the **background** — mining can take seconds to hours depending on target difficulty.
- `rana` must be installed (`which rana`). If missing, tell the user to install it: `cargo install rana`
- Never run rana with a private key or nsec as an argument — rana generates new keypairs, it does not accept existing keys.
- When rana finds a match it prints the nsec, pubkey, and npub to stdout. Capture this output.
- All npubs start with `npub1` — when the user wants `npub10000`, the vanity part is `0000` after the mandatory `npub1` prefix.
</essential_principles>

<process>
**Step 1 — Clarify target** (if not already clear)

Ask the user which type of target they want:
- **Hex prefix** — pubkey starts with e.g. `dead`, `0000`, `cafe` (hex chars only)
- **npub prefix** — npub starts with e.g. `npub1rana`, `npub10000` (bech32 chars: `qpzry9x8gf2tvdw0s3jn54khce6mua7l`)
- **npub suffix** — npub ends with specific chars
- **Difficulty** — NIP-13 leading zero bits (e.g. `20`)

Also ask for number of cores to use (default: all available).

**Step 2 — Check rana is installed**

```bash
which rana || echo "NOT FOUND"
```

If not found, stop and tell the user: `rana is required. Install with: cargo install rana`

**Step 3 — Build the rana command**

| Target type | Flag | Example |
|-------------|------|---------|
| Hex prefix | `--vanity=<hex>` | `rana --vanity=dead` |
| npub prefix | `--vanity-n-prefix=<prefix>` | `rana --vanity-n-prefix=npub1rana` |
| npub suffix | `--vanity-n-suffix=<suffix>` | `rana --vanity-n-suffix=end` |
| Difficulty | `--difficulty=<n>` | `rana --difficulty=20` |
| Multiple npub targets | `-n=<a>,<b>,<c>` | `rana -n=rana,h0dl` |

Add `--cores=<n>` if the user specified a core count.

**Note:** Cannot combine `--vanity` (hex) with `--vanity-n-prefix/suffix` or `--difficulty`. Pick one mode.

**Step 4 — Start background job**

Save output to a temp file, run in background:

```bash
OUTFILE=$(mktemp /tmp/rana-XXXXXX.txt)
echo "Output: $OUTFILE"
rana <flags> > "$OUTFILE" 2>&1 &
echo "PID: $!"
```

Tell the user: mining has started, PID and output file location.

**Step 5 — Monitor for completion**

Poll the output file every 10–30 seconds. Rana prints a result line when it finds a match. Look for lines containing `nsec` and `pubkey`.

```bash
cat "$OUTFILE"
```

When a result appears, extract and display:
- **nsec** (private key — sensitive! warn user to keep it safe)
- **pubkey** (hex)
- **npub** (bech32)

**Step 6 — Report result**

Present the result clearly:

```
✓ Found matching keypair!

pubkey: <hex>
npub:   <npub1...>
nsec:   <nsec1...>  ⚠️ Keep this secret — it's your private key

To configure Claude's Nostr channel with this key:
  /nostr:configure <nsec>
```

Offer to configure the Nostr channel automatically with the new key if desired.
</process>

<difficulty_guide>
**Expected mining time (rough estimates, single core):**

| Target | Difficulty | ~Time |
|--------|-----------|-------|
| 1 hex char (`a`) | 4 bits | instant |
| 2 hex chars (`de`) | 8 bits | < 1s |
| 4 hex chars (`dead`) | 16 bits | seconds |
| 6 hex chars (`dead00`) | 24 bits | minutes |
| 8 hex chars (`deadbeef`) | 32 bits | hours |
| npub prefix `npub1rana` | ~20 bits | minutes |

More cores = proportionally faster. Use `--cores=$(nproc)` for maximum speed.
</difficulty_guide>

<success_criteria>
- Background job is started and PID + output file are reported to the user
- Mining completes and the nsec/pubkey/npub are presented clearly
- User is warned that nsec is sensitive
</success_criteria>
