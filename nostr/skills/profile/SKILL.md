---
name: profile
description: View or update the Nostr profile (kind:0 metadata). Caches identity info in profile.json. Use when the user wants to set their Nostr name, bio, avatar, NIP-05, or lightning address.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash(ls *)
  - Bash(mkdir *)
  - mcp__plugin_nostr_nostr__publish_metadata
  - mcp__plugin_nostr_nostr__fetch_event
---

# /nostr:profile — Nostr Profile Management

Manages the Nostr kind:0 metadata for this identity and caches it at
`~/.claude/channels/nostr/profile.json`.

Arguments passed: `$ARGUMENTS`

---

## State file

**`~/.claude/channels/nostr/profile.json`**
```json
{
  "pubkey": "<hex>",
  "npub": "npub1...",
  "name": "alice",
  "display_name": "Alice",
  "about": "Bio text",
  "picture": "https://...",
  "website": "https://...",
  "nip05": "alice@domain.com",
  "lud16": "alice@domain.com",
  "updatedAt": 1234567890000
}
```

Only fields that have been set appear in the file. `pubkey`, `npub`, and `updatedAt`
are always written.

---

## Dispatch on arguments

### No args — show current profile

1. Read `~/.claude/channels/nostr/profile.json`. If missing, say no profile cached yet.
2. Display all fields clearly (skip undefined/missing ones).
3. Suggest: run `/nostr:profile set name=... display_name=...` to update.

### `set <field>=<value> [field=value ...]`

Parse `key=value` pairs. Supported fields:
- `name` — short handle
- `display_name` — display name
- `about` — bio
- `picture` — avatar URL
- `website` — website URL
- `nip05` — NIP-05 identifier
- `lud16` — lightning address

1. Parse all provided key=value pairs.
2. If profile.json exists, read it to merge with existing values (so unspecified fields are preserved).
3. Call `publish_metadata` tool with all merged fields (excluding `pubkey`, `npub`, `updatedAt`).
4. The tool publishes the kind:0 event and writes the updated profile.json.
5. Confirm what was updated.

### `fetch` — fetch profile from relays

1. Call `fetch_event` with `pubkey` from `.env`/identity and `kinds: [0]`.
2. Parse the event content (JSON).
3. Merge into profile.json (update cache).
4. Display the fetched profile.

---

## Implementation notes

- Always merge fields when updating — don't wipe fields the user didn't mention.
- The `publish_metadata` tool both publishes the event and writes profile.json atomically.
- If the Nostr server isn't running, `publish_metadata` will fail — tell the user to start it.
- NIP-05 and lud16 use the same `user@domain` format but serve different purposes (identity verification vs lightning payments).
