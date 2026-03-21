# technitium-dns

Claude Code plugin for managing [Technitium DNS Server](https://technitium.com/dns/) instances via the HTTP API.

## Skills

| Skill | Command | Description |
|---|---|---|
| configure | `/technitium-dns:configure` | Save server URL and API token (or username/password), test connection |
| zone | `/technitium-dns:zone` | List, create, delete, enable, or disable DNS zones |
| record | `/technitium-dns:record` | Add, get, update, or delete DNS records (A, AAAA, CNAME, MX, TXT, SRV, …) |
| query | `/technitium-dns:query` | View dashboard stats, top clients/domains, cache info, flush cache |

## Credentials

Stored in `~/.claude/channels/technitium-dns/.env` (chmod 600):

| Key | Description |
|---|---|
| `TECHNITIUM_URL` | Base URL of the Web Console, e.g. `http://192.168.1.1:5380` |
| `TECHNITIUM_TOKEN` | Non-expiring API token (recommended for automation) |
| `TECHNITIUM_USER` | Web Console username (alternative to token) |
| `TECHNITIUM_PASSWORD` | Web Console password (alternative to token) |

`TECHNITIUM_TOKEN` takes priority over `TECHNITIUM_USER`/`TECHNITIUM_PASSWORD` when both are present.

To create an API token via the Web Console: **Administration → API Tokens → Add Token**.

## License

Apache-2.0
