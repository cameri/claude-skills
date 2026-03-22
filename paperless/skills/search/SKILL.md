---
name: search
description: Search documents in Paperless-ngx. Use when the user wants to find documents, says "search paperless", "find documents about X", "show similar to doc ID N", or asks for document autocomplete suggestions.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash(http *)
  - Bash(python3 *)
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

## Metadata ID cache

The cache file lives at `~/.claude/channels/paperless/id_cache.json`.

### Cache JSON schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "correspondents": {
      "type": "object",
      "description": "Map of correspondent ID (string) → name",
      "additionalProperties": { "type": "string" }
    },
    "document_types": {
      "type": "object",
      "description": "Map of document type ID (string) → name",
      "additionalProperties": { "type": "string" }
    },
    "tags": {
      "type": "object",
      "description": "Map of tag ID (string) → name",
      "additionalProperties": { "type": "string" }
    }
  },
  "required": ["correspondents", "document_types", "tags"]
}
```

Example:
```json
{
  "correspondents": { "3": "RBC", "7": "Hydro Ottawa" },
  "document_types": { "2": "Statement", "3": "Contract" },
  "tags": { "5": "Mortgage", "9": "House" }
}
```

### Loading the cache

Use Python to load the cache (create an empty structure if the file doesn't exist):

```python
import json, os
CACHE_PATH = os.path.expanduser('~/.claude/channels/paperless/id_cache.json')
try:
    with open(CACHE_PATH) as f:
        cache = json.load(f)
except FileNotFoundError:
    cache = {"correspondents": {}, "document_types": {}, "tags": {}}
# Ensure all three keys exist (forward-compat)
for k in ("correspondents", "document_types", "tags"):
    cache.setdefault(k, {})
```

### Resolving IDs

For each unique ID needed that is **not already in the cache**, fetch it from the API:

- Correspondent: `GET /api/correspondents/<id>/` → `.name`
- Document type: `GET /api/document_types/<id>/` → `.name`
- Tag: `GET /api/tags/<id>/` → `.name`

If the API returns a 404 / `{"detail": "..."}` for an ID, store the sentinel
value `"?"` in the cache so it is not re-fetched on future runs.

After resolving any new IDs, **always save the updated cache** back to
`CACHE_PATH` (write the full JSON object, pretty-printed).

**Troubleshooting tip:** If all list endpoints return `count: 0` but individual
documents reference IDs, the API user may not own those objects (Paperless-ngx
scopes metadata per owner). In that case, resolved names will be `"?"` — report
this to the user and suggest switching to the owner account's credentials.

### Rendering resolved names

- If ID resolves to a real name → show the name.
- If ID resolves to `"?"` → show `ID:<id>` (unresolvable).
- If the field is `null` / absent → show `—`.

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
- **Correspondent** (resolved name, or `—`)
- **Document Type** (resolved name, or `—`)
- **Tags** (comma-separated resolved names, or `—`)
- **search_hit.score** (relevance score, if present)
- **search_hit.highlights** (snippet, if present)

Collect all unique correspondent IDs, document type IDs, and tag IDs from
all results, resolve missing ones via the API, update the cache, then render.

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
