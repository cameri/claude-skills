---
name: bech32
description: Encode and decode NIP-19 bech32 Nostr entities (note1, npub1, nevent1, nprofile1, naddr1). Use when the user provides a bech32 string and wants to extract the event ID, pubkey, or relay hints, or wants to encode a hex ID/pubkey into a bech32 string.
---

<objective>
Encode or decode NIP-19 bech32 entities using the nip19_decode and nip19_encode tools.
</objective>

<entities>
| Prefix    | Contains                                      | Use case                        |
|-----------|-----------------------------------------------|---------------------------------|
| npub1     | hex pubkey                                    | User identity                   |
| nsec1     | hex private key (handle with care)            | Private key export              |
| note1     | hex event ID                                  | Short text note reference       |
| nevent1   | event ID + optional relays, author, kind      | Event reference with hints      |
| nprofile1 | pubkey + optional relay hints                 | Profile reference with hints    |
| naddr1    | kind + pubkey + identifier + optional relays  | Replaceable event reference     |
</entities>

<process>

## Decoding

Call `nip19_decode` with the bech32 string:

```
nip19_decode(bech32: "nevent1qqsp...")
```

Returns `{ type, data }` where `data` depends on type:
- `note` → hex event ID string
- `npub` → hex pubkey string
- `nevent` → `{ id, relays?, author?, kind? }`
- `nprofile` → `{ pubkey, relays? }`
- `naddr` → `{ identifier, pubkey, kind, relays? }`

Present the decoded fields clearly. For nevent1, highlight the `id` (hex event ID) and any relay hints.

## Encoding

Call `nip19_encode` with the type and data:

```
nip19_encode(type: "nevent", data: { id: "abc123...", relays: ["wss://relay.damus.io"] })
nip19_encode(type: "npub", data: "hexpubkey...")
nip19_encode(type: "note", data: "hexeventid...")
```

</process>

<success_criteria>
Decoded: present all fields from the bech32 payload. For nevent1/nprofile1, surface the relay hints — they tell you where to fetch the event/profile.
Encoded: return the bech32 string ready to share.
</success_criteria>
