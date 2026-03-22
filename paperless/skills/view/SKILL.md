---
name: view
description: Download a Paperless-ngx document file by ID to a temp folder. If invoked from a Telegram channel, uploads the file to Telegram automatically.
user-invocable: true
allowed-tools:
  - Read
  - Bash(http *)
  - Bash(mktemp *)
  - Bash(curl *)
  - mcp__plugin_telegram_telegram__reply
---

# /paperless:view — Download and View a Document

Downloads the archived PDF for a Paperless-ngx document. When invoked from a
Telegram channel, sends the file directly to the chat.

Arguments passed: `$ARGUMENTS`

---

## Setup

Read `<base_dir>/../../references/auth.md` and follow the credential loading
instructions to obtain `TOKEN`.

---

## Arguments

Parse `$ARGUMENTS` for a document ID (integer). If none provided:

```
Usage: /paperless:view <document id>
Example: /paperless:view 774
```

---

## Fetch metadata

```bash
http --ignore-stdin -b \
  GET "${PAPERLESS_URL%/}/api/documents/<ID>/" \
  "Authorization:Token $TOKEN" \
  "Accept:application/json; version=6"
```

See `<base_dir>/../../references/document-display.md` for not-found handling
and filename sanitization rules. Extract `title`, `archived_file_name`,
`original_file_name`.

---

## Download

Prefer the archived version. Use curl for binary downloads:

```bash
TMPDIR=$(mktemp -d /tmp/paperless-XXXXXX)
FILENAME="${TMPDIR}/<sanitized_title>.pdf"

curl -s -L \
  -H "Authorization: Token $TOKEN" \
  -o "$FILENAME" \
  "${PAPERLESS_URL%/}/api/documents/<ID>/download/"
```

Verify the file is non-zero size. Pass `?original=true` only if the user
explicitly requests the original file.

---

## Output

Read `<base_dir>/../../references/document-display.md` for Telegram and CLI
output format.
