# webhooks

Receive webhook events from external systems as Claude channel notifications. Runs as a background MCP channel server — Express listens for inbound HTTP POSTs, responds `202 Accepted` immediately, and a BullMQ worker processes the queue and delivers notifications to Claude.

## Skills

| Skill | Description |
|---|---|
| `receive-webhooks` | Add, list, update, and remove webhook endpoints; configure auth and IP allowlisting |

## Example usage

```
/webhooks:receive-webhooks add a GitHub push webhook with HMAC auth
/webhooks:receive-webhooks list all webhooks
/webhooks:receive-webhooks disable the webhook abc12345
/webhooks:receive-webhooks remove the webhook abc12345
/webhooks:receive-webhooks show the current config
```

## Authentication modes

| Mode | Description |
|---|---|
| `none` | No verification — accept any POST |
| `hmac_sha256` | HMAC-SHA256 signature header (GitHub-compatible: `sha256=<hex>`) |
| `header` | Direct secret match in a named header (e.g. `X-Webhook-Secret`) |

## Supported content types

Requests with `Content-Type: application/json` are parsed and delivered as structured JSON. All other content types are delivered as raw text strings.

## Install

```
/plugin install webhooks@claude-skills
/reload-plugins
```

Then start Claude with the channel flag:

```sh
claude --dangerously-load-development-channels plugin:webhooks@claude-skills
```

> **Note:** `--dangerously-load-development-channels` requires interactive approval the first time. Once channels are generally available, use `--channels` instead.

## Requirements

- **Redis** — BullMQ uses Redis for the job queue. Defaults to `redis://localhost:6379`.

  Run a local Redis if needed:
  ```sh
  docker run -d -p 6379:6379 redis:alpine
  ```

- **Open port** — Express listens on port `3456` by default. Expose it or put it behind a reverse proxy so external services can reach it.

## Configuration

Use `set_config` to change defaults. Changes take effect on next server restart.

| Setting | Default | Description |
|---|---|---|
| `port` | `3456` | HTTP port Express listens on |
| `redis_url` | `redis://localhost:6379` | Redis connection URL for BullMQ |
| `trust_proxy` | `false` | Trust `X-Forwarded-For` for real client IP (enable when behind nginx/Caddy) |

## State

Webhook configurations persist across restarts in `~/.claude/channels/webhooks/webhooks.json`.
Server configuration persists in `~/.claude/channels/webhooks/config.json`.

## License

Apache-2.0
