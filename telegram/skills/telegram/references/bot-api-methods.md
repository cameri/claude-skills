# Telegram Bot API Methods Reference

This plugin exposes four MCP tools mapping to Telegram Bot API calls.

## reply → sendMessage / sendPhoto / sendDocument / sendAudio

Sends a message to a chat. Internally dispatches to the right Telegram method based on attached file types.

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| chat_id | string | yes | From inbound `<channel>` tag |
| text | string | yes | Message body |
| reply_to | string | no | message_id to thread under. Omit for normal replies |
| format | "text" \| "markdownv2" | no | Default: "text" |
| files | string[] | no | Absolute file paths. Max 50 MB each |

**File dispatch rules:**
- `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` → `sendPhoto` (inline preview)
- `.mp3`, `.ogg`, `.m4a`, `.wav` → `sendAudio`
- Everything else → `sendDocument`
- No files → `sendMessage`

**Chunking:** Messages longer than `textChunkLimit` (default 4096) are split automatically.

## react → setMessageReaction

Adds an emoji reaction to any message in an allowed chat.

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| chat_id | string | yes | |
| message_id | string | yes | The message to react to |
| emoji | string | yes | Must be in Telegram's reaction whitelist |

**Telegram reaction whitelist** (partial — common safe ones):
👍 👎 ❤️ 🔥 🥰 👏 😁 🤔 🤯 😱 🤬 😢 🎉 🤩 🤮 💩 🙏 👌 🕊 🤡 🥱 🥴 😍 🐳 ❤️‍🔥 🌚 🌭 💯 🤣 ⚡ 🍌 🏆 💔 🤨 😐 🍓 🍾 💋 🖕 😈 😴 😭 🤓 👻 👨‍💻 👀 🎃 🙈 😇 😂 🎅 ✅ ❌

## edit_message → editMessageText

Edits a message previously sent by the bot.

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| chat_id | string | yes | |
| message_id | string | yes | Must be a bot-sent message |
| text | string | yes | New content |
| format | "text" \| "markdownv2" | no | Default: "text" |

**Note:** Editing does not trigger a push notification. Always follow up with a new `reply` to notify the user when a task completes.

Cannot edit: messages sent by users, messages older than 48h, forwarded messages.

## download_attachment → getFile + download

Downloads an attachment from Telegram to the local inbox directory.

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| file_id | string | yes | From `attachment_file_id` in inbound `<channel>` tag |

Returns: absolute local file path (e.g. `/home/node/.claude/channels/telegram/inbox/<timestamp>-<file_id>.ext`)

**Limits:**
- Max file size: 20 MB (Telegram Bot API limit for downloads)
- Files are saved to `~/.claude/channels/telegram/inbox/`

## Attachment Types

| attachment_kind | Typical MIME | Notes |
|----------------|--------------|-------|
| voice | audio/ogg | Voice messages — always transcribe with ElevenLabs STT |
| audio | audio/mpeg, audio/ogg | Audio files |
| photo | image/jpeg | Already downloaded to `image_path` — no need to call download_attachment |
| document | varies | Files sent as documents |
| video | video/mp4 | Video messages |
| sticker | image/webp | Telegram stickers |
| video_note | video/mp4 | Round video messages |

## Unsupported Operations

The following Telegram Bot API methods are **not** exposed by this plugin:
- `sendPoll`, `sendLocation`, `sendContact`, `sendDice`
- `pinMessage`, `unpinMessage`
- `banChatMember`, `unbanChatMember`
- `createInviteLink`
- Inline keyboards / callback queries
- Webhook management (plugin uses long-polling)
