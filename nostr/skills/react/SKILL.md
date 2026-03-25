---
name: react
description: React to a Nostr event with a NIP-25 kind:7 reaction — like (+), dislike (-), or any emoji. Use when the user wants to react to, like, or emoji-respond to a Nostr note or event.
---

<objective>
Publish a NIP-25 kind:7 reaction to a Nostr event using the `react` tool.
</objective>

<reactions>
| Content | Meaning         |
|---------|-----------------|
| `+`     | Like / upvote   |
| `-`     | Dislike         |
| emoji   | Custom reaction |
</reactions>

<process>

Call `react` with the target event ID and your reaction content:

```
react(event_id, content?, author_pubkey?, target_kind?)
```

- `event_id` — hex, note1, or nevent1 (required)
- `content` — `+`, `-`, or an emoji (default: `+`)
- `author_pubkey` — npub or hex of the event author; adds a `p` tag (recommended)
- `target_kind` — kind of the target event; adds a `k` tag (recommended)

**If the user provides a nevent1**, the author pubkey is embedded — pass it as `author_pubkey`.

</process>

<examples>

Like a note by ID:
```
react(event_id: "abc123...", content: "+")
```

React with an emoji, tagging the author:
```
react(event_id: "abc123...", content: "🤙", author_pubkey: "npub1...", target_kind: 1)
```

</examples>

<success_criteria>
Returns the reaction event ID and note1 bech32. The reaction is published to all connected relays.
</success_criteria>
