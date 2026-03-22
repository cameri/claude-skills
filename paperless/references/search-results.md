# Search Results Display

Display results as a numbered list. For each document in `results`:

- **ID** and **title**
- **Created** date
- **Correspondent** (resolved name, or `—`)
- **Document Type** (resolved name, or `—`)
- **Tags** (comma-separated resolved names, or `—`)
- **search_hit.score** (relevance score, if present)
- **search_hit.highlights** (snippet truncated to ~200 chars, if present)

Collect all unique correspondent, document type, and tag IDs from all results,
resolve missing ones via the API using the id-cache, then render.

See `id-cache.md` for ID resolution and rendering rules.

## Empty results

If `count` is 0: *"No documents found for: `<query>`"*

## Pagination

If `next` is non-null, show the first page and note:
*"Showing first `<n>` of `<count>` results. Narrow your query for more specific results."*
