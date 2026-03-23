---
name: content
description: Show the extracted text content of a Paperless-ngx document by ID. Use when the user wants to read, view, or display the text of a document.
user-invocable: true
allowed-tools:
  - Read
  - Bash(http *)
---

# /paperless:content — Show Document Text Content

Fetches and displays the extracted OCR text of a Paperless-ngx document.

Arguments passed: `$ARGUMENTS`

---

## Setup

Read `<base_dir>/../../references/auth.md` and follow the credential loading
instructions to obtain `TOKEN`.

---

## Arguments

Parse `$ARGUMENTS` for a document ID (integer). If none provided:

```
Usage: /paperless:content <document id>
Example: /paperless:content 774
```

---

## Fetch and display

```bash
http --ignore-stdin -b \
  GET "${PAPERLESS_URL%/}/api/documents/<ID>/" \
  "Authorization:Token $TOKEN" \
  "Accept:application/json; version=6"
```

Read `<base_dir>/../../references/document-display.md` for the header format
and not-found handling.

After the header, show the full `content` field (OCR text) — do not truncate.
If `content` is empty or null: *"No text content available for document `<id>`.
The file may not have been OCR-processed yet."*
