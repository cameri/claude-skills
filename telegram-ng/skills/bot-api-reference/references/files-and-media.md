# Files & Media

Source: https://core.telegram.org/bots/api (Bot API 10.2, released 2026-07-14) — fetched 2026-08-18.

## The file_id model

Every media object (`PhotoSize`, `Animation`, `Audio`, `Document`, `Video`, `VideoNote`, `Voice`, ...) carries three identity fields. Understanding the difference matters more than any single field table below.

| Field | Scope | Can download/resend with it? | Notes |
|---|---|---|---|
| `file_id` | Per-bot | Yes — pass it as the media parameter to resend, or to `getFile` to prepare a download | Reusable for resending at no upload cost, but **not transferable between bots** — the same underlying file can also have multiple different valid `file_id` values, even for the same bot |
| `file_unique_id` | Global, stable over time and across bots | No — cannot be used to download or resend | Use this to recognize "is this the same underlying file" across bots/sessions; it is the identity anchor, `file_id` is not |
| `file_path` | Only present on the `File` object returned by `getFile` | Used to build the download URL `https://api.telegram.org/file/bot<token>/<file_path>` | Not present on the media objects themselves — you only get it after calling `getFile` |

See [`#sending-files`](https://core.telegram.org/bots/api#sending-files), [`#file`](https://core.telegram.org/bots/api#file).

## Three ways to send a file

| Method | Size limit | How |
|---|---|---|
| Reuse existing `file_id` | **No limit** | Pass the `file_id` string as the media parameter instead of uploading |
| HTTP URL | **5 MB** for photos, **20 MB** for other content types | Pass an HTTP URL as the media parameter; Telegram downloads and sends it server-side |
| Multipart upload (`multipart/form-data`) | **10 MB** for photos, **50 MB** for other files | Post the file the same way a browser file-upload form does |

### Sending by file_id — gotchas

- It is **not possible to change the file type** when resending by `file_id` — a [video](https://core.telegram.org/bots/api#video) can't be [sent as a photo](https://core.telegram.org/bots/api#sendphoto), a [photo](https://core.telegram.org/bots/api#photosize) can't be [sent as a document](https://core.telegram.org/bots/api#senddocument), etc.
- It is **not possible to resend thumbnails**.
- Resending a photo by `file_id` sends **all of its [sizes](https://core.telegram.org/bots/api#photosize)** (the whole `PhotoSize` array), not just one.
- `file_id` is **unique per bot** and **can't be transferred from one bot to another**.
- `file_id` uniquely identifies a file, but **a file can have different valid `file_id`s even for the same bot** — don't assume `file_id` equality is the right way to dedupe; use `file_unique_id` for that.

### Sending by URL — gotchas

- The target file must have the correct MIME type for the method being used (e.g. `audio/mpeg` for [sendAudio](https://core.telegram.org/bots/api#sendaudio)).
- [sendDocument](https://core.telegram.org/bots/api#senddocument) by URL **currently only works for `.PDF` and `.ZIP` files** — anything else silently isn't guaranteed to work.
- [sendVoice](https://core.telegram.org/bots/api#sendvoice) by URL requires the file to be `audio/ogg` and **no more than 1 MB**. A 1–20 MB voice note sent by URL is instead delivered as a generic file (`Document`), not a playable voice bubble.
- "Other configurations may work but we can't guarantee that they will" — Telegram's own words; don't rely on undocumented URL/MIME combinations.

Source: [`#sending-files`](https://core.telegram.org/bots/api#sending-files).

## Downloading a file

1. Call [`getFile`](https://core.telegram.org/bots/api#getfile) with a `file_id`. It returns a [`File`](https://core.telegram.org/bots/api#file) object.
2. Build the download URL from the returned `file_path`: `https://api.telegram.org/file/bot<token>/<file_path>`.
3. Fetch that URL. **Bots can download files of up to 20 MB** on the default (non-local) Bot API server — this is a hard ceiling independent of the 50 MB upload limit.
4. The download link is **guaranteed valid for at least 1 hour**. When it expires, call `getFile` again to get a fresh `file_path`/link — don't cache the URL long-term.
5. `getFile` "may not preserve the original file name and MIME type" — save those from the original message's media object (e.g. `Document.file_name`, `Document.mime_type`) if you need them, don't expect `getFile` to hand them back.

Source: [`#getfile`](https://core.telegram.org/bots/api#getfile), [`#file`](https://core.telegram.org/bots/api#file).

## Media type objects

All of these share `file_id` and `file_unique_id` per the model above; only the type-specific fields are called out beyond that.

### PhotoSize

One size of a photo or a file/sticker thumbnail.

| Field | Type | Description |
|---|---|---|
| `file_id` | String | Identifier for this file — can be used to download or reuse |
| `file_unique_id` | String | Stable unique identifier; can't be used to download or reuse |
| `width` | Integer | Photo width |
| `height` | Integer | Photo height |
| `file_size` | Integer | *Optional.* File size in bytes |

### Animation

A GIF or H.264/MPEG-4 AVC video without sound.

| Field | Type | Description |
|---|---|---|
| `file_id` | String | Identifier for this file |
| `file_unique_id` | String | Stable unique identifier |
| `width` | Integer | Video width as defined by the sender |
| `height` | Integer | Video height as defined by the sender |
| `duration` | Integer | Duration in seconds as defined by the sender |
| `thumbnail` | [PhotoSize](https://core.telegram.org/bots/api#photosize) | *Optional.* Animation thumbnail |
| `file_name` | String | *Optional.* Original filename as defined by the sender |
| `mime_type` | String | *Optional.* MIME type as defined by the sender |
| `file_size` | Integer | *Optional.* File size in bytes (may exceed 2^31; use 64-bit int or double) |

### Audio

An audio file meant to be treated as music by Telegram clients.

| Field | Type | Description |
|---|---|---|
| `file_id` | String | Identifier for this file |
| `file_unique_id` | String | Stable unique identifier |
| `duration` | Integer | Duration in seconds as defined by the sender |
| `performer` | String | *Optional.* Performer, as defined by sender or audio tags |
| `title` | String | *Optional.* Title, as defined by sender or audio tags |
| `file_name` | String | *Optional.* Original filename as defined by the sender |
| `mime_type` | String | *Optional.* MIME type as defined by the sender |
| `file_size` | Integer | *Optional.* File size in bytes (may exceed 2^31; use 64-bit int or double) |
| `thumbnail` | [PhotoSize](https://core.telegram.org/bots/api#photosize) | *Optional.* Thumbnail of the album cover |

### Document

A general file, as opposed to photos, voice messages, and audio files.

| Field | Type | Description |
|---|---|---|
| `file_id` | String | Identifier for this file |
| `file_unique_id` | String | Stable unique identifier |
| `thumbnail` | [PhotoSize](https://core.telegram.org/bots/api#photosize) | *Optional.* Document thumbnail |
| `file_name` | String | *Optional.* Original filename as defined by the sender |
| `mime_type` | String | *Optional.* MIME type as defined by the sender |
| `file_size` | Integer | *Optional.* File size in bytes (may exceed 2^31; use 64-bit int or double) |

### Video

| Field | Type | Description |
|---|---|---|
| `file_id` | String | Identifier for this file |
| `file_unique_id` | String | Stable unique identifier |
| `width` | Integer | Video width as defined by the sender |
| `height` | Integer | Video height as defined by the sender |
| `duration` | Integer | Duration in seconds as defined by the sender |
| `thumbnail` | [PhotoSize](https://core.telegram.org/bots/api#photosize) | *Optional.* Video thumbnail |
| `cover` | Array of [PhotoSize](https://core.telegram.org/bots/api#photosize) | *Optional.* Available sizes of the video's cover in the message |
| `start_timestamp` | Integer | *Optional.* Timestamp in seconds from which the video plays in the message |
| `qualities` | Array of VideoQuality | *Optional.* List of available video qualities |
| `file_name` | String | *Optional.* Original filename as defined by the sender |
| `mime_type` | String | *Optional.* MIME type as defined by the sender |
| `file_size` | Integer | *Optional.* File size in bytes (may exceed 2^31; use 64-bit int or double) |

### VideoNote

A round "video message" (Telegram v4.0+).

| Field | Type | Description |
|---|---|---|
| `file_id` | String | Identifier for this file |
| `file_unique_id` | String | Stable unique identifier |
| `length` | Integer | Video width and height (diameter of the video message) as defined by the sender |
| `duration` | Integer | Duration in seconds as defined by the sender |
| `thumbnail` | [PhotoSize](https://core.telegram.org/bots/api#photosize) | *Optional.* Video thumbnail |
| `file_size` | Integer | *Optional.* File size in bytes |

### Voice

A voice note.

| Field | Type | Description |
|---|---|---|
| `file_id` | String | Identifier for this file |
| `file_unique_id` | String | Stable unique identifier |
| `duration` | Integer | Duration in seconds as defined by the sender |
| `mime_type` | String | *Optional.* MIME type as defined by the sender |
| `file_size` | Integer | *Optional.* File size in bytes (may exceed 2^31; use 64-bit int or double) |

### File

Returned by `getFile`; represents a file ready to be downloaded.

> Downloadable via `https://api.telegram.org/file/bot<token>/<file_path>`. Guaranteed valid for at least 1 hour; re-request via `getFile` when expired. **The maximum file size to download is 20 MB.**

| Field | Type | Description |
|---|---|---|
| `file_id` | String | Identifier for this file |
| `file_unique_id` | String | Stable unique identifier |
| `file_size` | Integer | *Optional.* File size in bytes (may exceed 2^31; use 64-bit int or double) |
| `file_path` | String | *Optional.* File path; combine with the token to build the download URL |

Source: [`#photosize`](https://core.telegram.org/bots/api#photosize), [`#animation`](https://core.telegram.org/bots/api#animation), [`#audio`](https://core.telegram.org/bots/api#audio), [`#document`](https://core.telegram.org/bots/api#document), [`#video`](https://core.telegram.org/bots/api#video), [`#videonote`](https://core.telegram.org/bots/api#videonote), [`#voice`](https://core.telegram.org/bots/api#voice), [`#file`](https://core.telegram.org/bots/api#file).

## send* methods — size and format limits

Every method below accepts the media as `InputFile or String` (see [`InputFile`](https://core.telegram.org/bots/api#inputfile)) — a `file_id`, an HTTP URL, or a multipart upload — subject to the three-tier limits in the table above, further capped/constrained per method as follows:

| Method | Cap | Format constraint |
|---|---|---|
| [sendPhoto](https://core.telegram.org/bots/api#sendphoto) | 10 MB (per the general photo upload cap) | Width + height sum ≤ 10000 total; width:height ratio ≤ 20:1 |
| [sendAudio](https://core.telegram.org/bots/api#sendaudio) | 50 MB (may change in future) | Must be `.MP3` or `.M4A` to display in the music player; use `sendVoice` for voice messages instead |
| [sendDocument](https://core.telegram.org/bots/api#senddocument) | 50 MB (may change in future) | Any file type for upload; **by-URL sending only works for `.PDF` and `.ZIP`** |
| [sendVideo](https://core.telegram.org/bots/api#sendvideo) | 50 MB (may change in future) | Telegram clients natively support MPEG4; other formats may be delivered as `Document` instead |
| [sendAnimation](https://core.telegram.org/bots/api#sendanimation) | 50 MB (may change in future) | GIF or soundless H.264/MPEG-4 AVC video |
| [sendVoice](https://core.telegram.org/bots/api#sendvoice) | 50 MB (may change in future) | Must be `.OGG`/OPUS, `.MP3`, or `.M4A` to render as a playable voice bubble; other formats may be sent as `Audio`/`Document`. By-URL additionally requires `audio/ogg` and ≤1 MB or it becomes a generic file send |
| [sendVideoNote](https://core.telegram.org/bots/api#sendvideonote) | Follows the general upload caps above | Must be a **square** (rounded) MPEG4 video, up to 1 minute long; **sending by URL is unsupported** — file_id or multipart upload only |
| [sendMediaGroup](https://core.telegram.org/bots/api#sendmediagroup) | Each item follows its own type's cap above | 2–10 items; documents/audio can only be grouped in an album with messages of the *same* type as each other |

Source: [`#sendphoto`](https://core.telegram.org/bots/api#sendphoto), [`#sendaudio`](https://core.telegram.org/bots/api#sendaudio), [`#senddocument`](https://core.telegram.org/bots/api#senddocument), [`#sendvideo`](https://core.telegram.org/bots/api#sendvideo), [`#sendanimation`](https://core.telegram.org/bots/api#sendanimation), [`#sendvoice`](https://core.telegram.org/bots/api#sendvoice), [`#sendvideonote`](https://core.telegram.org/bots/api#sendvideonote), [`#sendmediagroup`](https://core.telegram.org/bots/api#sendmediagroup).

Shared across all of the above: thumbnails, where accepted, must be JPEG, under 200 kB, with width and height not exceeding 320, and can only be uploaded fresh (not resent by `file_id`) — pass `attach://<file_attach_name>` when uploading one alongside the media via multipart/form-data.

## InputMedia family

Used as the `media` array items in [sendMediaGroup](https://core.telegram.org/bots/api#sendmediagroup) and as the payload for `editMessageMedia`. Each variant's `media` field takes the same file_id / URL / `attach://<file_attach_name>` forms described above.

### InputMediaPhoto

| Field | Type | Description |
|---|---|---|
| `type` | String | Must be `photo` |
| `media` | String | File to send — file_id / HTTP URL / `attach://` |
| `caption` | String | *Optional.* 0–1024 chars after entity parsing |
| `parse_mode` | String | *Optional.* Caption parse mode |
| `caption_entities` | Array of MessageEntity | *Optional.* Alternative to `parse_mode` |
| `show_caption_above_media` | Boolean | *Optional.* Show caption above the media |
| `has_spoiler` | Boolean | *Optional.* Cover with a spoiler animation |

### InputMediaVideo

| Field | Type | Description |
|---|---|---|
| `type` | String | Must be `video` |
| `media` | String | File to send |
| `thumbnail` | String | *Optional.* JPEG, <200 kB, ≤320px each side; multipart-only |
| `cover` | String | *Optional.* Cover image for the video in the message |
| `start_timestamp` | Integer | *Optional.* Start timestamp in the message |
| `caption`, `parse_mode`, `caption_entities`, `show_caption_above_media` | — | Same as photo |
| `width`, `height`, `duration` | Integer | *Optional.* |
| `supports_streaming` | Boolean | *Optional.* Suitable for streaming |
| `has_spoiler` | Boolean | *Optional.* Cover with a spoiler animation |

### InputMediaAnimation

| Field | Type | Description |
|---|---|---|
| `type` | String | Must be `animation` |
| `media` | String | File to send |
| `thumbnail` | String | *Optional.* Same constraints as above |
| `caption`, `parse_mode`, `caption_entities`, `show_caption_above_media` | — | Same as photo |
| `width`, `height`, `duration` | Integer | *Optional.* |
| `has_spoiler` | Boolean | *Optional.* Cover with a spoiler animation |

### InputMediaAudio

| Field | Type | Description |
|---|---|---|
| `type` | String | Must be `audio` |
| `media` | String | File to send |
| `thumbnail` | String | *Optional.* Album-cover thumbnail, same constraints as above |
| `caption`, `parse_mode`, `caption_entities` | — | Same as photo (no `show_caption_above_media`) |
| `duration`, `performer`, `title` | — | *Optional.* |

### InputMediaDocument

| Field | Type | Description |
|---|---|---|
| `type` | String | Must be `document` |
| `media` | String | File to send |
| `thumbnail` | String | *Optional.* Same constraints as above |
| `caption`, `parse_mode`, `caption_entities` | — | Same as photo |
| `disable_content_type_detection` | Boolean | *Optional.* Disables server-side content-type sniffing for multipart uploads; forced `True` when the document is part of an album |

### Rarer / newer variants (not usable in sendMediaGroup)

- `InputMediaLivePhoto` — a live photo (`media` = video, `photo` = static image); URL sending unsupported.
- `InputMediaLocation` / `InputMediaVenue` — a location or venue as "media" (used elsewhere, e.g. paid media flows), not a file at all.
- `InputMediaLink` — a bare HTTP link (`url` field only).
- `InputMediaSticker` — a sticker; URL sending is `.WEBP`-only, uploads can be `.WEBP`/`.TGS`/`.WEBM`.
- `InputMediaVoiceNote` — a voice message file with `caption`/`duration`; newer addition, check current docs before relying on it in `sendMediaGroup`.

### InputFile

The abstract "contents of a file to be uploaded" type — in practice, this just means posting the file as `multipart/form-data`, the same way a browser file-upload form does. It has no fields of its own; wherever a parameter's type is `InputFile or String`, passing a String means file_id or URL instead.

Source: [`#inputmedia`](https://core.telegram.org/bots/api#inputmedia), [`#inputfile`](https://core.telegram.org/bots/api#inputfile).

## Local Bot API Server

Running your own [telegram-bot-api](https://github.com/tdlib/telegram-bot-api) server instead of using `https://api.telegram.org` changes the file-size rules substantially:

| Aspect | Hosted (default) server | Local server |
|---|---|---|
| Download size | 20 MB max | **Unlimited** |
| Upload size | 10 MB (photo) / 50 MB (other) | **Up to 2000 MB** |
| Upload source | file_id / URL / multipart only | Also supports **local file paths** via the [file URI scheme](https://en.wikipedia.org/wiki/File_URI_scheme) |
| `getFile` result | `file_path` used to build a remote download URL | `file_path` is the **absolute local path** on disk — no download step needed at all |

A local server also lifts webhook restrictions (HTTP webhook URLs, any local IP, any port, `max_webhook_connections` up to 100000) — not file-specific, but relevant if `server.ts` ever needs those.

Source: [`#using-a-local-bot-api-server`](https://core.telegram.org/bots/api#using-a-local-bot-api-server).

## Gotchas

- **The 20 MB download ceiling is a common surprise.** It's a *download* cap on the default hosted server, separate from and smaller than the 50 MB *upload* cap for documents/audio/video — a bot can happily receive a 45 MB voice memo or video from a user, but `getFile` + download will fail or truncate past 20 MB unless you're running a local Bot API server.
- **`file_id` can't change media type on resend.** A `Video`'s `file_id` can only be resent via `sendVideo`, not `sendPhoto`/`sendDocument`, even though Telegram might internally treat the bytes similarly.
- **`file_id` is bot-scoped.** If `server.ts` ever rotates or swaps the bot token (e.g. moving from claude-ricardo's bot to a different one), any `file_id` values persisted from the old bot become unusable — they need to be re-fetched from the source message, not just re-sent.
- **`sendDocument` by URL is `.PDF`/`.ZIP`-only.** Trying to send any other file type by URL through `sendDocument` isn't guaranteed to work — prefer multipart upload for arbitrary file types.
- **Prefer multipart upload for anything near the URL-mode limits.** URL mode caps out at 5 MB (photo) / 20 MB (other) — well below the 10 MB / 50 MB multipart caps — so a file that's, say, 15 MB will fail via URL but succeed via direct upload. When in doubt, upload directly rather than passing a URL and hoping Telegram's fetch succeeds under the tighter limit.
