---
name: configure
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

# /technitium-dns:configure — Technitium DNS Server Credentials Setup

Writes Technitium DNS Server credentials to `~/.claude/channels/technitium-dns/{env}.env` and
verifies the connection. Supports both API token auth (preferred for automation) and
username/password auth (which obtains a session token per request).

Arguments passed: `$ARGUMENTS`

---

## Environment selection

Parse `env=<name>` from `$ARGUMENTS` before any other processing. Strip it from the
remaining arguments. Default to `""` (empty string) if not provided.

The credential file for the selected environment is:
`~/.claude/channels/technitium-dns/${ENV}.env`

When `ENV` is empty the path resolves to `~/.claude/channels/technitium-dns/.env`,
which is the default environment and preserves backwards compatibility.
When displaying the environment name, show "(default)" for an empty `ENV`.
When suggesting commands, omit the `env=` argument if `ENV` is empty.

---

## Credential file format

`~/.claude/channels/technitium-dns/${ENV}.env`:

```
TECHNITIUM_URL=http://192.168.1.1:5380
TECHNITIUM_TOKEN=myapitoken
```

Or, if using username/password instead of an API token:

```
TECHNITIUM_URL=http://192.168.1.1:5380
TECHNITIUM_USER=admin
TECHNITIUM_PASSWORD=mypassword
```

`TECHNITIUM_TOKEN` takes priority over `TECHNITIUM_USER`/`TECHNITIUM_PASSWORD` if all are set.
Single-quote values containing special characters. `chmod 600` after writing.

---

## Dispatch on arguments (after stripping `env=`)

### No args — status and guidance

Read `~/.claude/channels/technitium-dns/${ENV}.env` (missing = not configured) and show:

1. **Environment** — show the active environment name, or "(default)" if `ENV` is empty.
2. **Server URL** — `TECHNITIUM_URL`: show the value, or "not set".
3. **Auth method** — if `TECHNITIUM_TOKEN` is set: show "API token (set, masked)".
   If `TECHNITIUM_USER`/`TECHNITIUM_PASSWORD` are set: show username and "password set".
   If nothing: show "not configured".
4. **Connection test** — if URL and at least one auth method is present, test it:
   - With token:
     ```
     http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/user/session/get" token=="$TECHNITIUM_TOKEN"
     ```
   - With user/pass (obtain a session token first):
     ```
     http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/user/login" user=="$TECHNITIUM_USER" pass=="$TECHNITIUM_PASSWORD" includeInfo==true
     ```
   - Success: response JSON `status` == `"ok"` → show "✓ Connection OK" plus the server version from the response if available.
   - Failure: show the error message from the response and suggest which credential is likely wrong.

5. **What next** — end with a concrete next step based on state:
   - No file or missing URL → show setup command syntax and ask the user to provide values.
   - Configured but connection failed → *"Run `/technitium-dns:configure` again after correcting the failing credential."*
   - All set, connection OK → *"Ready. You can now use `/technitium-dns:zone`, `/technitium-dns:record`, and `/technitium-dns:query`."*
6. **Available environments** — list all files in `~/.claude/channels/technitium-dns/`
   matching `*.env`, stripping the `.env` suffix. Display `.env` as "(default)".

### Guided setup — `setup`

Walk the user through configuring credentials interactively:

1. Explain what each credential is:
   - **TECHNITIUM_URL**: Base URL of the Technitium DNS Web Console (e.g. `http://192.168.1.1:5380`).
   - **TECHNITIUM_TOKEN** (recommended): A non-expiring API token. Create one in the Web Console under **Administration → API Tokens**, or run:
     ```
     http --ignore-stdin -b GET "http://<host>:5380/api/user/createToken" user==admin pass==<password> tokenName==claude
     ```
     Then copy the `token` value from the response.
   - **TECHNITIUM_USER** / **TECHNITIUM_PASSWORD**: Regular Web Console credentials. A session token is obtained per-request (expires per session timeout, default 30 min).

2. Ask the user to run the explicit form once they have the values (omit `env=` for the default environment):
   ```
   /technitium-dns:configure url=<URL> token=<TOKEN>
   ```
   or
   ```
   /technitium-dns:configure url=<URL> user=<USER> password=<PASS>
   ```

### Explicit save — `url=<URL> token=<TOKEN>` or `url=<URL> user=<USER> password=<PASS>`

Parse `$ARGUMENTS` for key=value pairs (space-separated). Accept both forms:
- `url=http://...` and `TECHNITIUM_URL=http://...` (strip the `TECHNITIUM_` prefix if present, case-insensitive).

Required: `url` plus at least one of (`token`) or (`user` + `password`).

If required keys are missing, tell the user which are absent and stop.

1. `mkdir -p ~/.claude/channels/technitium-dns`
2. Read existing `${ENV}.env` if present; update/add only the provided keys, preserve any others.
3. Strip any trailing slash from `TECHNITIUM_URL` before writing.
4. Write back in the format `KEY='value'` (single-quoted to handle special characters).
5. `chmod 600 ~/.claude/channels/technitium-dns/${ENV}.env`
6. Test the connection (same as status check above).
7. Show the result and full status.

### `clear` — remove all credentials for this environment

Delete `~/.claude/channels/technitium-dns/${ENV}.env`. Confirm first:
*"This will remove all Technitium DNS credentials for the selected environment. Are you sure?"*
Only proceed if confirmed.

### `clear <key>` — remove a single credential

Remove only the named key line from the `${ENV}.env` file.
Valid keys: `url`, `token`, `user`, `password`.

---

## Implementation notes

- Always strip trailing slashes from `TECHNITIUM_URL` — both when saving and constructing API URLs.
- `TECHNITIUM_TOKEN` takes priority over `TECHNITIUM_USER`/`TECHNITIUM_PASSWORD` when both are set.
- When using user/pass, call `/api/user/login` to get a session `token`, then use that token for the actual operation. Do not cache the session token in the `.env` file.
- Never log or display `TECHNITIUM_PASSWORD` or the full `TECHNITIUM_TOKEN` value. Mask all but the first 4 characters.
- The channels dir may not exist on first run. Missing file = not configured, not an error.
- If the connection test fails with a TLS error, suggest checking `http://` vs `https://` and certificate validity.
- All Technitium API calls return JSON with a `status` field: `"ok"` = success, `"error"` = failure (see `errorMessage`), `"invalid-token"` = expired/bad token.
