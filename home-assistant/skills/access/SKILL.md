---
name: access
description: Configure Home Assistant credentials — save the server URL and long-lived access token. Use when setting up the HA plugin, checking connection status, or rotating the token.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash(ls *)
  - Bash(mkdir *)
  - Bash(chmod *)
  - Bash(http *)
---

<objective>
Writes Home Assistant credentials to `~/.claude/channels/home-assistant/.env` and verifies the connection. Requires a Long-Lived Access Token (generated in HA under Profile → Security → Long-Lived Access Tokens).
</objective>

<quick_start>
Save credentials: `/home-assistant:access url=http://homeassistant.local:8123 token=<TOKEN>`

Check status: `/home-assistant:access` (no args)

Guided setup: `/home-assistant:access setup`
</quick_start>

<credential_format>
`~/.claude/channels/home-assistant/.env`:

```
HA_URL=http://homeassistant.local:8123
HA_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Strip trailing slash from `HA_URL` before writing. Single-quote values containing special characters. `chmod 600` after writing.
</credential_format>

<workflow>
**No args — status check:**

Read `~/.claude/channels/home-assistant/.env` (missing = not configured) and show:

1. **Server URL** — `HA_URL`: show value or "not set".
2. **Token** — `HA_TOKEN`: show "set (masked)" or "not set".
3. **Connection test** — if both are present:
   ```
   http --ignore-stdin -b GET "${HA_URL%/}/api/" \
     "Authorization: Bearer $HA_TOKEN"
   ```
   - Success (`{"message": "API running."}`): show "Connection OK".
   - Failure: show HTTP status and error, suggest checking URL and token.
4. **What next** — based on state:
   - Not configured → show save command syntax.
   - Connection failed → suggest re-running with corrected values.
   - All OK → list available skills.

**`setup` — guided setup:**

Explain each credential:
- **HA_URL**: Base URL of your HA instance (e.g. `http://homeassistant.local:8123` or `https://ha.yourdomain.com`).
- **HA_TOKEN**: Long-Lived Access Token. Generate one in HA under **Profile → Security → Long-Lived Access Tokens → Create Token**.

Then ask the user to run:
```
/home-assistant:access url=<URL> token=<TOKEN>
```

**Explicit save — `url=<URL> token=<TOKEN>`:**

Parse key=value pairs from `$ARGUMENTS`. Accept both `url=`/`HA_URL=` and `token=`/`HA_TOKEN=` forms (case-insensitive, strip `HA_` prefix).

Required: both `url` and `token`. List absent keys and stop if missing.

1. `mkdir -p ~/.claude/channels/home-assistant`
2. Read existing `.env` if present; update/add provided keys, preserve others.
3. Strip trailing slash from `HA_URL` before writing.
4. Write back as `KEY=value` (single-quote values with special characters).
5. `chmod 600 ~/.claude/channels/home-assistant/.env`
6. Test connection (same as status check above).
7. Show result and full status.

**`clear` — remove credentials:**

Delete `~/.claude/channels/home-assistant/.env`. Confirm first: "This will remove all Home Assistant credentials. Are you sure?"
</workflow>

<security_checklist>
- Never display `HA_TOKEN` in full — show only "set (masked)" or first 8 chars + `...`
- Always `chmod 600` the `.env` file after writing
- Always strip trailing slashes from `HA_URL`
- If TLS error on connection test, suggest checking `http://` vs `https://` and certificate validity
</security_checklist>

<success_criteria>
- Credentials written to `~/.claude/channels/home-assistant/.env` with `chmod 600`
- Connection test returns `{"message": "API running."}`
- Token never fully exposed in output
- User knows exactly what to do next
</success_criteria>
