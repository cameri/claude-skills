---
name: upload-document
description: Upload a document to Paperless-ngx. Use when the user wants to add a file to Paperless-ngx, says "upload this document", "add to paperless", or provides a file path to ingest.
user-invocable: true
allowed-tools:
  - Read
  - Bash(http *)
  - Bash(mkdir *)
---

<objective>
Uploads a local file to Paperless-ngx and polls for the task result, reporting the assigned document ID on success.
</objective>

<quick_start>
`/paperless:upload-document file=<path>`

Example: `/paperless:upload-document file=~/Downloads/invoice.pdf title="January Invoice"`
</quick_start>

<setup>
Read `<base_dir>/../../references/auth.md` and follow the credential loading instructions to obtain `TOKEN`.
</setup>

<argument_parsing>
Parse `$ARGUMENTS` as key=value pairs:

| Key                  | Description                                       |
|----------------------|---------------------------------------------------|
| `file=<path>`        | **Required.** Absolute or `~`-expanded file path  |
| `title=<text>`       | Optional title                                    |
| `created=<date>`     | Optional date, e.g. `2024-01-15`                  |
| `correspondent=<id>` | Correspondent ID (integer)                        |
| `document_type=<id>` | Document type ID (integer)                        |
| `tags=<id,id,...>`   | Comma-separated tag IDs                           |
| `asn=<number>`       | Archive serial number                             |

If `file` is missing: *"Please provide a file path, e.g. `/paperless:upload-document file=~/Downloads/invoice.pdf`"*
</argument_parsing>

<workflow>
Expand `~` in the file path. Omit optional fields entirely if not provided.
Tags must be sent as repeated form fields (not comma-separated):

```bash
http --ignore-stdin -b \
  POST "${PAPERLESS_URL%/}/api/documents/post_document/" \
  "Authorization:Token $TOKEN" \
  "Accept:application/json; version=6" \
  document@"$FILE_PATH" \
  [title="$TITLE"] [created="$CREATED"] \
  [correspondent="$CORRESPONDENT"] [document_type="$DOCUMENT_TYPE"] \
  [archive_serial_number="$ASN"] \
  [tags=<id1> tags=<id2> ...]
```

The response is a task UUID string — strip quotes: `echo "$RESPONSE" | tr -d '"'`.

Poll `GET /api/tasks/?task_id=<uuid>` up to 10 times with 5-second delays:

- `"SUCCESS"` → "✓ Uploaded. Document ID: `results[0].related_document`"
- `"FAILURE"` → show `results[0].result` and stop
- `"PENDING"` / `"STARTED"` → keep polling

If 10 attempts exhaust without terminal state: *"Upload queued (task `<uuid>`). Check later with `GET /api/tasks/?task_id=<uuid>`."*
</workflow>

<success_criteria>
- File uploaded and task UUID received
- Polling completes with SUCCESS state and document ID reported
- FAILURE state surfaces the error message clearly
- Timeout gives the user the task UUID to check manually
</success_criteria>
