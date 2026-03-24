---
name: save-url
description: Save a URL to Wallabag. Use when the user says "add to wallabag", "save to wallabag", "save this article", or pastes a URL and wants to read it later.
user-invocable: true
allowed-tools:
  - Read
  - Bash(http *)
  - Bash(source *)
---

<objective>
Saves a URL to the user's Wallabag instance using OAuth2 password grant authentication. Supports optional tags and a custom title.
</objective>

<quick_start>
`/wallabag:save-url https://example.com/article`

With tags: `/wallabag:save-url https://example.com/article #tag1 #tag2`

With title: `/wallabag:save-url https://example.com/article "My custom title"`
</quick_start>

<context>
Parse `env=<name>` from `$ARGUMENTS` before any other processing. Strip it from remaining arguments. Default to `""` (empty string). Credential file: `~/.claude/channels/wallabag/${ENV}.env`. Omit `env=` from suggested commands when ENV is empty.
</context>

<setup>
Load credentials from `~/.claude/channels/wallabag/${ENV}.env`. If the file doesn't exist or any key is missing, tell the user to run `/wallabag:configure-wallabag env=$ENV setup` first and stop.
</setup>

<argument_parsing>
Parse `$ARGUMENTS` (after stripping `env=`) for:
- **url** — the URL to save (required; stop with error if missing)
- **tags** — comma-separated list of tags if any `#tag` tokens are present
- **title** — custom title if a quoted string is present (optional)
</argument_parsing>

<workflow>
**Authenticate:**

```bash
source ~/.claude/channels/wallabag/${ENV}.env
TOKEN=$(http --ignore-stdin -f POST "${WALLABAG_URL%/}/oauth/v2/token" \
  grant_type=password \
  client_id="$WALLABAG_CLIENT_ID" \
  client_secret="$WALLABAG_CLIENT_SECRET" \
  username="$WALLABAG_USERNAME" \
  password="$WALLABAG_PASSWORD" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
```

If the token is empty, report an authentication failure and suggest running `/wallabag:configure-wallabag env=$ENV` to verify credentials.

**Save the entry:**

```bash
http --ignore-stdin POST "${WALLABAG_URL%/}/api/entries.json" \
  "Authorization:Bearer $TOKEN" \
  url="$URL" \
  tags="$TAGS" \
  title="$TITLE"
```

Omit `tags` and `title` fields if not provided.
</workflow>

<display_results>
- **HTTP 200** — success. Report:
  > 📥 Saved! "*{title}*" added to Wallabag (entry #{id}).
  If `http_status` in the response is `403`, add a note that the fetcher was blocked (e.g. Cloudflare) and the content may not be captured correctly.
- **HTTP 401** — token expired or invalid; suggest re-running `/wallabag:configure-wallabag env=$ENV`.
- **Other error** — show the status code and response body.
</display_results>

<success_criteria>
- URL saved to Wallabag and entry ID reported
- Authentication failure gives clear guidance to reconfigure
- Cloudflare/fetcher blocks noted when http_status is 403
</success_criteria>
