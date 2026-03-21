---
name: save
description: Save a URL to Wallabag. Use when the user says "add to wallabag", "save to wallabag", "save this article", or pastes a URL and wants to read it later.
user-invocable: true
allowed-tools:
  - Read
  - Bash(http *)
  - Bash(source *)
---

# /wallabag:save — Save a URL to Wallabag

Saves a URL to the user's Wallabag instance.

Arguments passed: `$ARGUMENTS`

---

## Environment selection

Parse `env=<name>` from `$ARGUMENTS` before any other processing. Strip it from the
remaining arguments. Default to `""` (empty string) if not provided.

The credential file for the selected environment is:
`~/.claude/channels/wallabag/${ENV}.env`

When `ENV` is empty the path resolves to `~/.claude/channels/wallabag/.env` (the default).
When suggesting commands, omit the `env=` argument if `ENV` is empty.

---

## Prerequisites

Load credentials from `~/.claude/channels/wallabag/${ENV}.env`. If the file doesn't
exist or any key is missing, tell the user to run `/wallabag:configure env=$ENV setup`
first and stop.

## Parsing `$ARGUMENTS` (after stripping `env=`)

`$ARGUMENTS` is a URL, optionally followed by tags or a title. Examples:
- `https://example.com/article`
- `https://example.com/article #tag1 #tag2`
- `https://example.com/article "My custom title"`

Extract:
- **url** — the URL to save (required)
- **tags** — comma-separated list of tags if any `#tag` tokens are present
- **title** — custom title if quoted string is present (optional)

If no URL is found in `$ARGUMENTS`, tell the user and stop.

## Authentication

Obtain an access token:

```bash
source ~/.claude/channels/wallabag/${ENV}.env
TOKEN=$(http --ignore-stdin -f POST "${WALLABAG_URL%/}/oauth/v2/token" \
  grant_type=password \
  client_id="$WALLABAG_CLIENT_ID" \
  client_secret="$WALLABAG_CLIENT_SECRET" \
  username="$WALLABAG_USERNAME" \
  password="$WALLABAG_PASSWORD" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
```

If the token is empty, report an authentication failure and suggest running
`/wallabag:configure env=$ENV` to verify credentials.

## Saving the entry

```bash
http --ignore-stdin POST "${WALLABAG_URL%/}/api/entries.json" \
  "Authorization:Bearer $TOKEN" \
  url="$URL" \
  tags="$TAGS" \
  title="$TITLE"
```

Omit `tags` and `title` fields if not provided.

## Response handling

- **HTTP 200** — success. Report:
  > 📥 Saved! "*{title}*" added to Wallabag (entry #{id}).
  If `http_status` in the response is `403`, add a note that the fetcher was
  blocked (e.g. Cloudflare) and the content may not be captured correctly.
- **HTTP 401** — token expired or invalid; suggest re-running `/wallabag:configure env=$ENV`.
- **Other error** — show the status code and response body.
