# audiobookshelf

Claude Code plugin for interacting with a self-hosted [Audiobookshelf](https://www.audiobookshelf.org/) instance via its REST API.

## Skills

| Skill | Command | Description |
|---|---|---|
| access | `/audiobookshelf:access` | Save server URL and API key, test connection |
| query-library | `/audiobookshelf:query-library` | List libraries, browse or search items, view item details, check listening progress |

## Credentials

Stored in `~/.claude/channels/audiobookshelf/.env` (chmod 600):

| Key | Description |
|---|---|
| `AUDIOBOOKSHELF_URL` | Base URL of the instance, e.g. `https://books.example.com` |
| `AUDIOBOOKSHELF_API_KEY` | API key from **Settings → Users → \<user\> → API Keys → New API Key** |

The key inherits whatever permissions its owning user has — a `root`-type user's key sees every library; a limited user's key only sees what that user can see.

## License

MIT
