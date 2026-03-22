# paperless — Claude Code Plugin

Manage documents in a [Paperless-ngx](https://docs.paperless-ngx.com/) instance via its REST API — upload, search, read, and download documents.

## Skills

| Skill | Description |
|---|---|
| `/paperless:configure` | Save the instance URL, username, and password; verify connection |
| `/paperless:upload` | Upload a local file to Paperless-ngx with optional metadata |
| `/paperless:search` | Full-text search, similarity search (`more_like=<id>`), or autocomplete |
| `/paperless:content` | Display the full OCR-extracted text of a document by ID |
| `/paperless:view` | Download the archived PDF for a document; when called from Telegram, sends the file directly to the chat |

## Credentials

The following keys are stored in `~/.claude/channels/paperless/.env`:

| Key | Description |
|---|---|
| `PAPERLESS_URL` | Base URL of your instance (e.g. `http://paperless-ngx:8000`) |
| `PAPERLESS_USERNAME` | Your Paperless-ngx username |
| `PAPERLESS_PASSWORD` | Your Paperless-ngx password |

Run `/paperless:configure` to set them up interactively.

> **Note:** The API user must own (or have been granted access to) the correspondents, tags, and document types you want resolved by name. If the `phoenix` service account cannot see metadata owned by another user, update the object-level permissions in Paperless-ngx or switch to the owner's credentials.

## Metadata ID cache

`/paperless:search` maintains a local cache of resolved IDs at
`~/.claude/channels/paperless/id_cache.json` to avoid redundant API calls.
The cache maps correspondent, document type, and tag IDs to their names.
Unresolvable IDs are stored as `"?"` so they are not re-fetched.

## Installation

```
/plugin marketplace add ~/Workspace/paperless-skill
/plugin install paperless@paperless
/reload-plugins
```

## License

Apache-2.0
