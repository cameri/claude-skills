---
name: content
description: Show the extracted text content of a Paperless-ngx document by ID. Use when the user wants to read, view, or display the text of a document.
user-invocable: true
allowed-tools:
  - Bash(http *)
  - Bash(python3 *)
---

# /paperless:content — Show Document Text Content

Fetches and displays the extracted text content of a Paperless-ngx document.

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
Usage: /paperless:content <document id>
Example: /paperless:content 774
```

---

## Fetch document

```bash
http --ignore-stdin -b \
  GET "${PAPERLESS_URL%/}/api/documents/<ID>/" \
  "Authorization:Token $TOKEN" \
  "Accept:application/json; version=6"
```

If the response contains `{"detail": "..."}` (404 / not found), report:
*"Document ID `<id>` not found."* and stop.

---

## Display

Show the document header followed by its full text content:

```
[<id>] <title>
Created: <created date, YYYY-MM-DD>
─────────────────────────────────────
<content field>
```

- The `content` field is the OCR-extracted text. Display it in full — do not
  truncate.
- If `content` is empty or null, say: *"No text content available for document
  `<id>`. The file may not have been OCR-processed yet."*

---

## Implementation notes

- Always pass `--ignore-stdin` to `http` to prevent blocking.
- Use `-b` (body-only) to get clean JSON for parsing.
- The `content` field may contain multiple newlines and special characters —
  print it as-is without escaping.
