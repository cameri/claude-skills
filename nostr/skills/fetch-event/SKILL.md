---
name: fetch-event
description: Fetch a specific Nostr event by ID or filter using the fetch_event tool. Use when the user wants to look up a note, DM, profile, or any Nostr event by its ID (hex or note1/nevent format), or by author/kind filter.
---

<objective>
Fetch one or more Nostr events using the fetch_event MCP tool and present them clearly.
</objective>

<process>
1. Identify the event ID or filter from the user's request:
   - Event ID formats: hex (64-char), note1... (bech32), nevent1... (bech32 with relay hints)
   - Author: npub or hex pubkey
   - Kind: numeric event kind (0=profile, 1=note, 4=DM, 7=reaction, 30023=article…)

2. Call the fetch_event tool:
   ```
   fetch_event(event_id?, pubkey?, kinds?, limit?, timeout_ms?)
   ```

3. Present the result:
   - For kind:1 notes: show content, author npub, timestamp, note1 ID
   - For kind:0 profiles: parse content JSON and show name, about, picture
   - For kind:4 DMs: note that content is encrypted (can't be decrypted without the private key unless it's addressed to us)
   - For other kinds: show raw event JSON

4. If no event found, report clearly and suggest checking the event ID or trying a longer timeout.
</process>

<common_kinds>
| Kind | Description |
|------|-------------|
| 0    | User metadata (profile) |
| 1    | Short text note |
| 3    | Contact list / follows |
| 4    | Encrypted DM (NIP-04) |
| 6    | Repost |
| 7    | Reaction (like) |
| 9735 | Zap receipt |
| 10002 | Relay list metadata |
| 30023 | Long-form article |
</common_kinds>

<success_criteria>
Event content is displayed in a human-readable format appropriate for its kind.
</success_criteria>
