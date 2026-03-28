---
name: access
description: Set up Technitium DNS Server credentials — save the server URL and API token (or username/password). Use when the user wants to configure Technitium DNS, connect to an instance, asks "how do I set this up," or wants to check connection status.
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
Writes Technitium DNS Server credentials to `~/.claude/channels/technitium-dns/{env}.env` and verifies the connection. Supports both API token auth (preferred for automation) and username/password auth (which obtains a session token per request).
</objective>

<quick_start>
Save with token: `/technitium-dns:access url=<URL> token=<TOKEN>`

Save with user/pass: `/technitium-dns:access url=<URL> user=<USER> password=<PASS>`

Check status: `/technitium-dns:access` (no args)

Guided setup: `/technitium-dns:access setup`
</quick_start>

<context>
Parse `env=<name>` from `$ARGUMENTS` before any other processing. Strip it from remaining arguments. Default to `""` (empty string). Display empty ENV as "(default)". Credential file: `~/.claude/channels/technitium-dns/${ENV}.env`. Omit `env=` from suggested commands when ENV is empty.
</context>

<credential_format>
`~/.claude/channels/technitium-dns/${ENV}.env`:

API token auth (preferred):
```
TECHNITIUM_URL=http://192.168.1.1:5380
TECHNITIUM_TOKEN=myapitoken
```

Or username/password auth:
```
TECHNITIUM_URL=http://192.168.1.1:5380
TECHNITIUM_USER=admin
TECHNITIUM_PASSWORD=mypassword
```

`TECHNITIUM_TOKEN` takes priority if both are set. Single-quote values containing special characters. `chmod 600` after writing.
</credential_format>

<workflow>
**No args — status and guidance:**

Read `~/.claude/channels/technitium-dns/${ENV}.env` (missing = not configured) and show:

1. **Environment** — active environment name, or "(default)" if ENV is empty.
2. **Server URL** — `TECHNITIUM_URL`: show value, or "not set".
3. **Auth method** — if `TECHNITIUM_TOKEN` set: "API token (set, masked)"; if `TECHNITIUM_USER`/`TECHNITIUM_PASSWORD` set: show username and "password set"; otherwise: "not configured".
4. **Connection test** — if URL and at least one auth method present:
   - With token:
     ```
     http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/user/session/get" token=="$TECHNITIUM_TOKEN"
     ```
   - With user/pass:
     ```
     http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/user/login" user=="$TECHNITIUM_USER" pass=="$TECHNITIUM_PASSWORD" includeInfo==true
     ```
   - Success (`status == "ok"`): show "✓ Connection OK" plus server version if available.
   - Failure: show error message and suggest which credential is wrong.
5. **What next** — concrete next step:
   - No file or missing URL → show setup command syntax and ask for values.
   - Configured but connection failed → *"Run `/technitium-dns:access` again after correcting the failing credential."*
   - All set, connection OK → *"Ready. You can now use `/technitium-dns:manage-dns-zones`, `/technitium-dns:manage-dns-records`, and `/technitium-dns:query-dns-stats`."*
6. **Available environments** — list all `*.env` files in `~/.claude/channels/technitium-dns/`, stripping `.env` suffix. Display `.env` as "(default)".

**`setup` — guided setup:**

1. Explain each credential:
   - **TECHNITIUM_URL**: Base URL of the Web Console (e.g. `http://192.168.1.1:5380`).
   - **TECHNITIUM_TOKEN** (recommended): Non-expiring API token. Create in Web Console under **Administration → API Tokens**, or run:
     ```
     http --ignore-stdin -b GET "http://<host>:5380/api/user/createToken" user==admin pass==<password> tokenName==claude
     ```
     Copy the `token` value from the response.
   - **TECHNITIUM_USER** / **TECHNITIUM_PASSWORD**: Web Console credentials (session token obtained per-request, expires per session timeout, default 30 min).
2. Ask user to run the explicit form once they have values (omit `env=` for default):
   ```
   /technitium-dns:access url=<URL> token=<TOKEN>
   ```

**Explicit save — `url=<URL> token=<TOKEN>` or `url=<URL> user=<USER> password=<PASS>`:**

Parse key=value pairs. Accept both `url=` and `TECHNITIUM_URL=` forms (strip `TECHNITIUM_` prefix if present, case-insensitive).

Required: `url` plus at least one of `token` or (`user` + `password`). List absent keys and stop if missing.

1. `mkdir -p ~/.claude/channels/technitium-dns`
2. Read existing `${ENV}.env` if present; update/add provided keys, preserve others.
3. Strip trailing slash from `TECHNITIUM_URL` before writing.
4. Write back as `KEY='value'` (single-quoted for special characters).
5. `chmod 600 ~/.claude/channels/technitium-dns/${ENV}.env`
6. Test the connection (same as status check).
7. Show result and full status.

**`clear` — remove all credentials for this environment:**

Delete `~/.claude/channels/technitium-dns/${ENV}.env`. Confirm first: *"This will remove all Technitium DNS credentials for the selected environment. Are you sure?"*

**`clear <key>` — remove a single credential:**

Remove only the named key line from `${ENV}.env`. Valid keys: `url`, `token`, `user`, `password`.
</workflow>

<security_checklist>
- Never log or display `TECHNITIUM_PASSWORD` — show set/not-set only
- Mask `TECHNITIUM_TOKEN` — show only first 4 chars + `...`
- Always `chmod 600` the `.env` file after writing
- Always strip trailing slashes from `TECHNITIUM_URL`
- `TECHNITIUM_TOKEN` takes priority over user/pass when both are set
- When using user/pass auth, do NOT cache the session token in the `.env` file — re-authenticate per request
- If TLS error on connection test, suggest checking `http://` vs `https://` and certificate validity
</security_checklist>

<success_criteria>
- Credentials written to `~/.claude/channels/technitium-dns/${ENV}.env` with `chmod 600`
- Connection test passes (`status == "ok"`)
- Status output never exposes password or full token
- User knows exactly what to do next based on current state
</success_criteria>
