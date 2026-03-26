---
name: receive-webhooks
description: Manage webhook endpoints and react to inbound webhook events from external services (GitHub, Stripe, CI/CD pipelines, etc.). Use when configuring webhook receivers, handling inbound HTTP callbacks, or setting up event-driven automation.
---

<objective>
Configure webhook endpoints and react to the events they deliver. Each webhook has a unique URL path, optional IP allowlisting, and a choice of security modes (HMAC-SHA256, direct secret header, or none). Incoming requests are queued via BullMQ and delivered to you as channel notifications.
</objective>

<quick_start>
**Add a webhook** — call `add_webhook` with a name and auth mode. The tool returns the URL path to configure in the external service.

**React to events** — when a webhook fires, a channel notification arrives:
```
<channel source="webhooks" webhook_id="abc123" webhook_name="GitHub Push" ...>
Webhook received: GitHub Push (abc123)
Method: POST
Source IP: 140.82.112.0
Content-Type: application/json
Received at: 2026-03-26T01:16:49Z

Payload:
{ "ref": "refs/heads/main", "commits": [...] }
</channel>
```
Parse the payload and act on it — open a PR, trigger a deploy, send a Telegram message, etc.
</quick_start>

<tools>
| Tool | Purpose |
|------|---------|
| `add_webhook` | Create a new endpoint. Returns `id` and `url_path`. |
| `list_webhooks` | List all configured webhooks (secrets redacted). |
| `update_webhook` | Edit name, enabled state, IPs, auth, or secret. |
| `remove_webhook` | Permanently delete a webhook. |
| `get_config` | Show port, Redis URL, trust proxy setting. |
| `set_config` | Update server config (restart required). |
</tools>

<auth_modes>
**`none`** — accept any POST with no verification. Use only for internal or trusted networks.

**`hmac_sha256`** — verify a HMAC-SHA256 signature header. The external service signs the request body with the shared secret and sends the hex digest in a header.
- Default header: `X-Signature-256`
- Default format: `sha256=<hex>` (GitHub-compatible — set `hmac_prefix: false` to expect raw hex)
- Example header: `X-Signature-256: sha256=a94b2c3d...`

**`header`** — require a specific header to equal the secret exactly (simple token auth).
- Default header: `X-Webhook-Secret`
- Example header: `X-Webhook-Secret: my-secret-token`
</auth_modes>

<ip_allowlist>
`allowed_ips` is an array of exact IP addresses. Empty array = allow all.

For services behind a reverse proxy, set `trust_proxy: true` in config so the server reads `X-Forwarded-For` for the real client IP.

**GitHub webhook IPs** (as of 2026): `140.82.112.0/20` range — use `set_config trust_proxy: true` if behind nginx/Caddy, then check GitHub's meta API for the current CIDR ranges and list them as individual IPs or note them in the webhook name.
</ip_allowlist>

<server_requirements>
The server requires:
- **Redis** — BullMQ uses Redis for the job queue. Default: `redis://localhost:6379`. Change with `set_config redis_url`.
- **Open port** — Express listens on port `3456` by default. Configure firewalls/port-forwarding so external services can reach it, or put it behind a reverse proxy.

If Redis is not available, the server will fail to start. Run a local Redis with:
```
docker run -d -p 6379:6379 redis:alpine
```

Check current config: call `get_config`.
</server_requirements>

<notification_format>
Channel notifications arrive with these meta attributes:
- `source` — always `"webhooks"`
- `webhook_id` — the short ID (e.g. `abc123`)
- `webhook_name` — the friendly name you gave the webhook
- `method` — HTTP method (always POST in practice)
- `content_type` — `Content-Type` header from the request
- `source_ip` — resolved client IP address
- `received_at` — ISO 8601 timestamp when the request arrived

The notification body contains the full payload as formatted JSON (or raw text for non-JSON content types).
</notification_format>

<common_workflows>
**GitHub push hook:**
1. `add_webhook` with `name: "GitHub Push"`, `auth_mode: "hmac_sha256"`, `secret: "<your-secret>"`
2. In GitHub repo → Settings → Webhooks → Add webhook
   - Payload URL: `http://<host>:3456/webhook/<id>`
   - Content type: `application/json`
   - Secret: same secret
3. When a push lands, parse `payload.commits` and `payload.ref` from the notification

**CI/CD notification:**
1. `add_webhook` with `name: "Deploy Done"`, `auth_mode: "header"`, `secret: "token-abc"`, `auth_header: "X-Deploy-Token"`
2. Configure your CI to POST with `X-Deploy-Token: token-abc` on pipeline completion
3. React by sending a Telegram message or updating a status page

**Disable without deleting:**
- `update_webhook` with `id: "<id>"`, `enabled: false`
- Re-enable: `update_webhook` with `enabled: true`
</common_workflows>

<success_criteria>
- Webhook added and URL path returned
- External service configured to POST to that path
- Test delivery succeeds (HTTP 202 response)
- Channel notification arrives with correct payload
- Claude reacts to the notification appropriately
</success_criteria>
