---
name: query-library
description: Query a configured Audiobookshelf instance — list libraries, browse or search items in a library, view item details, and check listening progress. Use when the user asks about their audiobooks, podcasts, libraries, or listening progress on Audiobookshelf.
user-invocable: true
allowed-tools:
  - Read
  - Bash(http *)
  - Bash(source *)
---

<objective>
Reads library, item, and listening-progress data from the configured Audiobookshelf instance via its REST API.
</objective>

<quick_start>
```
/audiobookshelf:query-library                       # list libraries
/audiobookshelf:query-library items <libraryId>      # list items in a library
/audiobookshelf:query-library search <libraryId> <query>
/audiobookshelf:query-library item <itemId>          # item details
/audiobookshelf:query-library me                     # current user + progress
```
</quick_start>

<context>
Parse `env=<name>` from `$ARGUMENTS` before any other processing. Strip it from remaining arguments. Default to `""` (empty string). Credential file: `~/.claude/channels/audiobookshelf/${ENV}.env`. Omit `env=` from suggested commands when ENV is empty.

Load `AUDIOBOOKSHELF_URL` and `AUDIOBOOKSHELF_API_KEY` from the env file. If missing, tell the user to run `/audiobookshelf:access` first.

Every request sends the key as a Bearer token:
```
Authorization:Bearer $AUDIOBOOKSHELF_API_KEY
```
</context>

<workflow>
Parse the first word of remaining arguments as the subcommand. Default to `libraries` if none given.

**`libraries`** — list all libraries the API key's user can see (verified live):

```
http --ignore-stdin -b GET "${AUDIOBOOKSHELF_URL%/}/api/libraries" \
  "Authorization:Bearer $AUDIOBOOKSHELF_API_KEY"
```

Returns `{"libraries": [...]}`. Display name, id, and media type (`book`/`podcast`) for each. An empty array means no libraries have been created yet in the web UI — say so plainly rather than treating it as an error.

**`items <libraryId> [limit=<n>]`** — list items in one library (verified live; empty libraries return an empty item list):

```
http --ignore-stdin -b GET "${AUDIOBOOKSHELF_URL%/}/api/libraries/<libraryId>/items" \
  "Authorization:Bearer $AUDIOBOOKSHELF_API_KEY" limit==<n>
```

Display title, author, and id for each result.

**`search <libraryId> <query>`** — search within one library (endpoint shape not yet live-verified — the library was empty when this skill was built, so results couldn't be confirmed; a bare top-level `/api/search` was tried and 404s, confirming search is scoped per-library, not global):

```
http --ignore-stdin -b GET "${AUDIOBOOKSHELF_URL%/}/api/libraries/<libraryId>/search" \
  "Authorization:Bearer $AUDIOBOOKSHELF_API_KEY" q=="<query>"
```

If this 404s or errors, tell the user the exact endpoint shape needs re-checking now that the library has content, rather than guessing further.

**`item <itemId>`** — item details (not yet live-verified, same reason as search):

```
http --ignore-stdin -b GET "${AUDIOBOOKSHELF_URL%/}/api/items/<itemId>" \
  "Authorization:Bearer $AUDIOBOOKSHELF_API_KEY"
```

**`me`** — current user profile and listening progress (verified live):

```
http --ignore-stdin -b GET "${AUDIOBOOKSHELF_URL%/}/api/me" \
  "Authorization:Bearer $AUDIOBOOKSHELF_API_KEY"
```

Display `username`, `type` (e.g. `root`), and summarize `mediaProgress` (empty is normal for a fresh account/library — say so, don't treat as an error).
</workflow>

<notes>
- `401`/`403` almost always means the API key is stale or was revoked in the web UI — point the user at `/audiobookshelf:access` to refresh it, don't guess at other causes first.
- If any endpoint 404s or returns an unexpected shape, trust the live response over this file and flag the mismatch to the user.
</notes>

<success_criteria>
- Correct endpoint used for the requested subcommand
- Results summarized readably, not dumped as raw JSON
- Empty results (empty library, no progress) explained as normal, not reported as failures
- Auth errors point the user at `/audiobookshelf:access`
</success_criteria>
