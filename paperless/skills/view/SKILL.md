---
name: view
description: Download a Paperless-ngx document file by ID to a temp folder. If invoked from a Telegram channel, uploads the file to Telegram automatically.
user-invocable: true
allowed-tools:
  - Read
  - Bash(http *)
  - Bash(python3 *)
  - Bash(mktemp *)
  - Bash(curl *)
  - mcp__plugin_telegram_telegram__reply
---

# /paperless:view — Download and View a Document

Downloads the original or archived document file for a Paperless-ngx document
by ID. When invoked from a Telegram channel, sends the file directly to the
chat.

Arguments passed: `$ARGUMENTS`

---

## Credential loading

Source credentials from `~/.claude/channels/paperless/.env`. If the file is
missing or any required key (`PAPERLESS_URL`, `PAPERLESS_USERNAME`,
`PAPERLESS_PASSWORD`) is absent, tell the user to run `/paperless:configure`
first and stop.

Obtain an auth token:

```bash
TOKEN=$(http --ignore-stdin -b POST "${PAPERLESS_URL%/}/api/token/" \
  username="$PAPERLESS_USERNAME" \
  password="$PAPERLESS_PASSWORD" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
```

If `TOKEN` is empty, report the authentication failure and stop.

---

## Arguments

Parse `$ARGUMENTS` for a document ID (integer). If no ID is provided, show:

```
Usage: /paperless:view <document id>
Example: /paperless:view 774
```

---

## Fetch document metadata

```bash
http --ignore-stdin -b \
  GET "${PAPERLESS_URL%/}/api/documents/<ID>/" \
  "Authorization:Token $TOKEN" \
  "Accept:application/json; version=6"
```

If the response contains `{"detail": "..."}` (404 / not found), report:
*"Document ID `<id>` not found."* and stop.

Extract from the response:
- `title` — used for the output filename
- `archived_file_name` — preferred filename if present (the archived PDF)
- `original_file_name` — fallback filename

---

## Download the file

Paperless-ngx serves the archived (PDF) version at:

```
GET /api/documents/<id>/download/
```

And the original file at:

```
GET /api/documents/<id>/download/?original=true
```

Prefer the archived version (no `?original=true`). Create a temp file with a
meaningful name derived from the document title (sanitize: replace spaces and
special characters with underscores, keep the extension from
`archived_file_name` or default to `.pdf`):

```bash
TMPDIR=$(mktemp -d /tmp/paperless-XXXXXX)
FILENAME="${TMPDIR}/<sanitized_title>.<ext>"
```

Download using curl (handles binary files and redirects correctly):

```bash
curl -s -L \
  -H "Authorization: Token $TOKEN" \
  -o "$FILENAME" \
  "${PAPERLESS_URL%/}/api/documents/<ID>/download/"
```

Verify the file was downloaded (non-zero size). If the file is empty or curl
failed, report an error and stop.

---

## Output

### When invoked from a Telegram channel

If this skill was invoked from a Telegram `<channel>` message (a `chat_id` is
available in context), use the `mcp__plugin_telegram_telegram__reply` tool to
send the file to the chat:

- `chat_id`: the chat_id from the inbound channel message
- `text`: `"[<id>] <title>"` (document title as caption)
- `files`: `["<FILENAME>"]` (absolute path to the downloaded file)

### When invoked from the terminal / CLI

Report the download location:

```
Downloaded: <FILENAME>
Document:   [<id>] <title>
```

---

## Implementation notes

- Always pass `--ignore-stdin` to `http` (for API metadata calls).
- Use `curl` (not `http`) for the binary file download — httpie may mangle
  binary content.
- Sanitize the filename: strip leading/trailing whitespace, replace `/`, `\`,
  `:`, `*`, `?`, `"`, `<`, `>`, `|` with `_`, collapse multiple underscores.
- The temp directory is not cleaned up automatically — it persists for the
  session so the user can open the file.
- Paperless serves the archived PDF by default; pass `?original=true` only if
  the user explicitly requests the original file.
