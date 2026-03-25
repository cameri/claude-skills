# /nostr:relay-list — NIP-65 Relay List Management

Manages the kind:10002 relay list for this Nostr identity. Cached locally at
`~/.claude/channels/nostr/relay-list.json`.

Arguments passed: `$ARGUMENTS`

---

## State file

**`~/.claude/channels/nostr/relay-list.json`**
```json
{
  "relays": [
    { "url": "wss://relay.damus.io" },
    { "url": "wss://inbox.relay.example.com", "marker": "read" },
    { "url": "wss://outbox.relay.example.com", "marker": "write" }
  ],
  "event_id": "<hex>",
  "created_at": 1234567890,
  "updatedAt": 1234567890000
}
```

Relay entries with no `marker` are read+write. `"read"` = inbox only.
`"write"` = outbox only.

---

## Dispatch on arguments

### No args — show current relay list

1. Call `get_relay_list` (no fetch_remote) to show local cache.
2. If no cache, say none published yet.
3. Suggest: `/nostr:relay-list set wss://relay1.com wss://relay2.com` to publish.

### `show` — show + fetch from remote

1. Call `get_relay_list` with `fetch_remote: true`.
2. Display local cache and what was found on each write relay.
3. Highlight any discrepancies between local and remote.

### `set <url> [url ...] [--read <url>] [--write <url>]`

Parse the argument list:
- Bare URLs → read+write (no marker)
- `--read <url>` → read-only
- `--write <url>` → write-only

Example: `set wss://relay.damus.io --read wss://inbox.nostr.com --write wss://outbox.nostr.com`

1. Build the relay entry list.
2. Call `publish_relay_list` with the entries and `force: false`.
3. If conflict is returned: show the conflicting remote relay list and ask
   the user whether to merge or force-override.
4. On success: confirm what was published and show the new relay list.

### `add <url> [--read|--write]`

1. Read local cache (or fetch remote if no cache).
2. Add the new entry (deduplicating by URL).
3. Call `publish_relay_list` with the merged list.

### `remove <url>`

1. Read local cache.
2. Remove the entry with that URL.
3. Call `publish_relay_list` with the updated list.

### `force-set <url> [url ...]`

Same as `set` but always passes `force: true` — skips the conflict check.
Warn the user this may override a newer remote relay list.

---

## Implementation notes

- Always check for conflicts before publishing (default `force: false`).
- When a conflict is found, show the remote relay list content so the user
  can make an informed decision about merging vs overriding.
- Relay markers: absent = read+write, `"read"` = inbox relay, `"write"` = outbox relay.
- NIP-65 consumers use write relays to find your posts and read relays to
  send you messages — getting this right matters for discoverability.
