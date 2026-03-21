---
name: upload
description: Upload a document to Paperless-ngx. Use when the user wants to add a file to Paperless-ngx, says "upload this document", "add to paperless", or provides a file path to ingest.
user-invocable: true
allowed-tools:
  - Read
  - Bash(http *)
  - Bash(mkdir *)
---

# /paperless:upload — Upload a Document to Paperless-ngx

Uploads a local file to Paperless-ngx via `POST /api/documents/post_document/`
and polls for the task result.

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

Parse `$ARGUMENTS` as space-separated key=value pairs. The `file` key is
required; all others are optional.

| Key                   | Description                                      |
|-----------------------|--------------------------------------------------|
| `file=<path>`         | **Required.** Absolute or `~`-expanded file path |
| `title=<text>`        | Optional title for the document                  |
| `created=<date>`      | Optional date, e.g. `2024-01-15`                 |
| `correspondent=<id>`  | Correspondent ID (integer)                        |
| `document_type=<id>`  | Document type ID (integer)                        |
| `tags=<id,id,...>`    | Comma-separated tag IDs                          |
| `asn=<number>`        | Archive serial number                            |

If `file` is missing, tell the user: *"Please provide a file path, e.g.
`/paperless:upload file=~/Downloads/invoice.pdf title=Invoice 2024`"*

---

## Upload

Expand `~` in the file path before use. Build the `http` command:

```bash
http --ignore-stdin -b \
  POST "${PAPERLESS_URL%/}/api/documents/post_document/" \
  "Authorization:Token $TOKEN" \
  "Accept:application/json; version=6" \
  document@"$FILE_PATH" \
  [title="$TITLE"] \
  [created="$CREATED"] \
  [correspondent="$CORRESPONDENT"] \
  [document_type="$DOCUMENT_TYPE"] \
  [archive_serial_number="$ASN"]
```

For `tags`, add a separate `tags=<id>` form field for each tag ID (httpie
repeats the field):

```bash
# example: tags=1,2,3 becomes:
tags==1 tags==2 tags==3
```

The response is a task UUID string, e.g. `"abc123-..."`.

---

## Poll for result

After upload, poll `GET /api/tasks/?task_id=<uuid>` up to 10 times with a
5-second delay between attempts:

```bash
http --ignore-stdin -b \
  GET "${PAPERLESS_URL%/}/api/tasks/" \
  "Authorization:Token $TOKEN" \
  task_id=="$TASK_UUID"
```

The response is a list; check `results[0].status`:

- `"SUCCESS"` — show: "✓ Uploaded successfully. Document ID:
  `results[0].related_document`"
- `"FAILURE"` — show the error from `results[0].result` and stop.
- `"PENDING"` or `"STARTED"` — keep polling.

If 10 attempts are exhausted without a terminal state, report: *"Upload
queued (task `<uuid>`). Check status later with
`GET /api/tasks/?task_id=<uuid>`."*

---

## Implementation notes

- Always expand `~` in the file path before passing it to `http`.
- Omit optional form fields entirely (don't send empty strings) to avoid
  Paperless rejecting blank values.
- Tags must be sent as repeated form fields, not as a comma-separated string.
- The task UUID is returned as a plain JSON string (not an object), so parse
  it by stripping quotes: `echo "$RESPONSE" | tr -d '"'`.
