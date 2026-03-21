---
name: search
description: Search documents in Paperless-ngx. Use when the user wants to find documents, says "search paperless", "find documents about X", "show similar to doc ID N", or asks for document autocomplete suggestions.
user-invocable: true
allowed-tools:
  - Read
  - Bash(http *)
---

# /paperless:search — Search Documents in Paperless-ngx

Searches documents in Paperless-ngx using full-text search, similarity
matching, or autocomplete.

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

## Dispatch on arguments

Parse `$ARGUMENTS` for mode and parameters.

### Full-text search — `query=<text>` or bare text

When the argument contains `query=<text>` **or** is bare text with no
recognized key prefix, treat it as a full-text search:

```bash
http --ignore-stdin -b \
  GET "${PAPERLESS_URL%/}/api/documents/" \
  "Authorization:Token $TOKEN" \
  "Accept:application/json; version=6" \
  query=="$QUERY"
```

Display results as a numbered list. For each document in `results`:
- **ID** and **title**
- **Created** date
- **search_hit.score** (relevance score)
- **search_hit.highlights** (snippet showing matched text, if present)

If `count` is 0, say: *"No documents found for: `<query>`"*

### Similarity search — `more_like=<id>`

Find documents similar to a given document ID:

```bash
http --ignore-stdin -b \
  GET "${PAPERLESS_URL%/}/api/documents/" \
  "Authorization:Token $TOKEN" \
  "Accept:application/json; version=6" \
  more_like=="$ID"
```

Display results the same way as full-text search, sorted by rank.

### Autocomplete — `autocomplete=<term>` or `complete=<term>`

Fetch autocomplete suggestions for a partial term:

```bash
http --ignore-stdin -b \
  GET "${PAPERLESS_URL%/}/api/search/autocomplete/" \
  "Authorization:Token $TOKEN" \
  term=="$TERM" \
  limit==10
```

Display the returned suggestions as a plain list.

### No args — usage hint

If `$ARGUMENTS` is empty, show:
```
Usage:
  /paperless:search <query text>
  /paperless:search query=<text>
  /paperless:search more_like=<document id>
  /paperless:search autocomplete=<partial term>
```

---

## Implementation notes

- Always pass `--ignore-stdin` to `http` to prevent blocking.
- Use `-b` (body-only) to get clean JSON for parsing.
- The `query==` and `more_like==` syntax in httpie sends them as URL query
  parameters (double `==`), not form fields.
- `search_hit` may be absent for non-search list responses; handle gracefully.
- Truncate long highlights to ~200 characters to keep output readable.
- If the API returns paginated results (`next` field is non-null), show the
  first page and note: *"Showing first <n> of <count> results. Narrow your
  query for more specific results."*
