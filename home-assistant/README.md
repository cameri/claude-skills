# home-assistant

Claude Code plugin for interacting with [Home Assistant](https://www.home-assistant.io/) via the REST API.

## Skills

| Skill | Command | Description |
|---|---|---|
| access | `/home-assistant:access` | Save HA_URL and HA_TOKEN, test connection |
| get-state | `/home-assistant:get-state` | Get entity state(s), filter by domain |
| call-service | `/home-assistant:call-service` | Call HA services to control devices |
| set-state | `/home-assistant:set-state` | Create or update entity state directly |
| fire-event | `/home-assistant:fire-event` | Fire custom HA events |
| render-template | `/home-assistant:render-template` | Render Jinja2 templates |
| query-history | `/home-assistant:query-history` | Query state history and logbook |

## Credentials

Stored in `~/.claude/channels/home-assistant/.env` (chmod 600):

| Key | Description |
|---|---|
| `HA_URL` | Base URL of your HA instance, e.g. `http://homeassistant.local:8123` |
| `HA_TOKEN` | Long-Lived Access Token (Profile → Security → Long-Lived Access Tokens) |

## License

Apache-2.0
