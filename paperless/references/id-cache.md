# Metadata ID Cache

The cache file lives at `~/.claude/channels/paperless/id_cache.json`.

## Schema

```json
{
  "correspondents": { "<id>": "<name>", ... },
  "document_types": { "<id>": "<name>", ... },
  "tags":           { "<id>": "<name>", ... }
}
```

## Loading

```python
import json, os
CACHE_PATH = os.path.expanduser('~/.claude/channels/paperless/id_cache.json')
try:
    with open(CACHE_PATH) as f:
        cache = json.load(f)
except FileNotFoundError:
    cache = {"correspondents": {}, "document_types": {}, "tags": {}}
for k in ("correspondents", "document_types", "tags"):
    cache.setdefault(k, {})
```

## Resolving IDs

For each unique ID not already in the cache, fetch from the API:

- Correspondent: `GET /api/correspondents/<id>/` → `.name`
- Document type: `GET /api/document_types/<id>/` → `.name`
- Tag: `GET /api/tags/<id>/` → `.name`

If the API returns 404 / `{"detail": "..."}`, store `"?"` so it isn't re-fetched.

After resolving, always save the updated cache (full JSON, pretty-printed).

## Rendering

- Real name → show the name
- `"?"` → show `ID:<id>` (unresolvable)
- `null` / absent → show `—`

## Troubleshooting

If all list endpoints return `count: 0` but documents reference IDs, the API
user may not own those objects (Paperless-ngx scopes metadata per owner).
Resolved names will be `"?"` — suggest switching to the owner account.
