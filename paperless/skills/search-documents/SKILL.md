---
name: search-documents
description: Search documents in Paperless-ngx. Use when the user wants to find documents, says "search paperless", "find documents about X", "show similar to doc ID N", or asks for document autocomplete suggestions.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash(http *)
  - Bash(python3 *)
---

<objective>
Searches Paperless-ngx documents using full-text search, similarity matching, or autocomplete. Dispatches to the appropriate API endpoint based on argument format and displays results using shared formatting references.
</objective>

<quick_start>
```
/paperless:search-documents <query text>
/paperless:search-documents more_like=<document id>
/paperless:search-documents autocomplete=<partial term>
```
</quick_start>

<setup>
Read `<base_dir>/../../references/auth.md` for credential loading.
Read `<base_dir>/../../references/id-cache.md` for metadata cache instructions.
</setup>

<workflow>
Parse `$ARGUMENTS` for mode:

**Full-text search** — `query=<text>` or bare text:

```bash
http --ignore-stdin -b \
  GET "${PAPERLESS_URL%/}/api/documents/" \
  "Authorization:Token $TOKEN" \
  "Accept:application/json; version=6" \
  query=="$QUERY"
```

Display results per `<base_dir>/../../references/search-results.md`.

**Similarity search** — `more_like=<id>`:

```bash
http --ignore-stdin -b \
  GET "${PAPERLESS_URL%/}/api/documents/" \
  "Authorization:Token $TOKEN" \
  "Accept:application/json; version=6" \
  more_like=="$ID"
```

Display results per `<base_dir>/../../references/search-results.md`, sorted by rank.

**Autocomplete** — `autocomplete=<term>` or `complete=<term>`:

```bash
http --ignore-stdin -b \
  GET "${PAPERLESS_URL%/}/api/search/autocomplete/" \
  "Authorization:Token $TOKEN" \
  term=="$TERM" \
  limit==10
```

Display returned suggestions as a plain list.

**No arguments** — show usage hint:

```
Usage:
  /paperless:search-documents <query text>
  /paperless:search-documents query=<text>
  /paperless:search-documents more_like=<document id>
  /paperless:search-documents autocomplete=<partial term>
```
</workflow>

<notes>
- `query==` and `more_like==` use httpie's double-`==` syntax for URL query params.
- `search_hit` may be absent for non-search responses; handle gracefully.
</notes>

<success_criteria>
- Correct API endpoint called based on argument mode
- Results displayed using format from search-results.md
- Autocomplete returns a plain list of suggestions
- Missing arguments show the usage hint
</success_criteria>
