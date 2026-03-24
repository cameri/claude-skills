---
name: view-content
description: Show the extracted text content of a Paperless-ngx document by ID. Use when the user wants to read, view, or display the text of a document.
user-invocable: true
allowed-tools:
  - Read
  - Bash(http *)
---

<objective>
Fetches and displays the extracted OCR text of a Paperless-ngx document by its numeric ID.
</objective>

<quick_start>
`/paperless:view-content <document id>`

Example: `/paperless:view-content 774`
</quick_start>

<setup>
Read `<base_dir>/../../references/auth.md` and follow the credential loading instructions to obtain `TOKEN`.
</setup>

<argument_parsing>
Parse `$ARGUMENTS` for a document ID (integer). If none provided:

```
Usage: /paperless:view-content <document id>
Example: /paperless:view-content 774
```
</argument_parsing>

<workflow>
```bash
http --ignore-stdin -b \
  GET "${PAPERLESS_URL%/}/api/documents/<ID>/" \
  "Authorization:Token $TOKEN" \
  "Accept:application/json; version=6"
```

Read `<base_dir>/../../references/document-display.md` for the header format and not-found handling.

After the header, show the full `content` field (OCR text) — do not truncate.
If `content` is empty or null: *"No text content available for document `<id>`. The file may not have been OCR-processed yet."*
</workflow>

<success_criteria>
- Document header displayed using format from document-display.md
- Full OCR text shown without truncation
- If no text: clear message shown explaining the document has no extracted content
</success_criteria>
