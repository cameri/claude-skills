---
name: configure
description: Set up the Nostr channel — save the nsec private key, manage relays, and configure subscribed event kinds. Use when the user wants to configure Nostr, add/remove relays, or change subscribed kinds.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash(ls *)
  - Bash(mkdir *)
---

# /nostr:configure — Nostr Channel Setup

Manages `~/.claude/channels/nostr/.env` (nsec) and
`~/.claude/channels/nostr/config.json` (relays, kinds).

Arguments passed: `$ARGUMENTS`

---

## State files

**`~/.claude/channels/nostr/.env`**
```
NOSTR_NSEC=nsec1...
```

**`~/.claude/channels/nostr/config.json`**
```json
{
  "relays": ["wss://relay.damus.io", "wss://offchain.pub"],
  "subscribeKinds": []
}
```

---

## Dispatch on arguments

### No args — status

Show:
1. **Identity** — NOSTR_NSEC set/not-set; if set, show npub (derive from nsec)
2. **Relays** — list from config.json
3. **Subscribed kinds** — list (always includes kind:4 for DMs)
4. **What next** — concrete next step

### `<nsec>` — save private key

1. Validate starts with `nsec1`.
2. `mkdir -p ~/.claude/channels/nostr`
3. Read existing `.env` if present; update/add `NOSTR_NSEC=` line, preserve other keys.
4. Write back. `chmod 600 ~/.claude/channels/nostr/.env`.
5. Confirm. Remind user the server needs a restart to pick up the new key.

### `relay add <wss://...>`

1. Read config.json (create defaults if missing).
2. Add relay URL to `relays` array (dedupe).
3. Write back. Confirm.

### `relay rm <wss://...>`

1. Read config.json.
2. Remove the URL. Write back. Confirm.

### `relay list`

List all configured relays.

### `kinds add <kind1> [kind2 ...]`

1. Parse kind numbers.
2. Read config.json, add to `subscribeKinds` (dedupe), write.
3. Note: kind:4 (DMs) is always subscribed regardless.

### `kinds rm <kind1> [kind2 ...]`

Remove specified kinds from `subscribeKinds`.

---

## Implementation notes

- The nsec is a credential — always `chmod 600` the .env file.
- Never echo the full nsec back to the user.
- The server reads config at subscription time — relay changes need a restart or reconnect.
- Default relays: `wss://relay.damus.io`, `wss://offchain.pub`
