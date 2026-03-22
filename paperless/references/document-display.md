# Document Display Format

## Header

```
[<id>] <title>
Created: <created date, YYYY-MM-DD>
─────────────────────────────────────
```

## Not found

If the API response contains `{"detail": "..."}` (404), report:
*"Document ID `<id>` not found."* and stop.

## File sanitization (for downloads)

Sanitize filenames: strip leading/trailing whitespace, replace `/`, `\`, `:`,
`*`, `?`, `"`, `<`, `>`, `|` with `_`, collapse multiple underscores.
Prefer the extension from `archived_file_name`; default to `.pdf`.

## Telegram output

If invoked from a Telegram `<channel>` (a `chat_id` is available in context),
use the `mcp__plugin_telegram_telegram__reply` tool:

- `chat_id`: from the inbound channel message
- `text`: `"[<id>] <title>"`
- `files`: `["<absolute path>"]` (for view/download)

## CLI output

When not in a Telegram context:

```
Downloaded: <FILENAME>
Document:   [<id>] <title>
```
