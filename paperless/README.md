# paperless — Claude Code Plugin

Upload documents to and search a [Paperless-ngx](https://docs.paperless-ngx.com/) instance via its REST API.

## Skills

| Skill | Description |
|---|---|
| `/paperless:configure` | Save the instance URL, username, and password; verify connection |
| `/paperless:upload` | Upload a local file to Paperless-ngx with optional metadata |
| `/paperless:search` | Full-text search, similarity search, or autocomplete |

## Credentials

The following keys are stored in `~/.claude/channels/paperless/.env`:

| Key | Description |
|---|---|
| `PAPERLESS_URL` | Base URL of your instance (e.g. `http://paperless-ngx:8000`) |
| `PAPERLESS_USERNAME` | Your Paperless-ngx username |
| `PAPERLESS_PASSWORD` | Your Paperless-ngx password |

Run `/paperless:configure` to set them up interactively.

## Installation

```
/plugin marketplace add ~/Workspace/paperless-skill
/plugin install paperless@paperless
/reload-plugins
```

## License

Apache-2.0
