---
name: configure
description: Set up Wallabag credentials — save the instance URL, OAuth client ID/secret, and user credentials. Use when the user wants to configure Wallabag, asks to connect to a Wallabag instance, asks "how do I set this up," or wants to check current Wallabag connection status.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash(ls *)
  - Bash(mkdir *)
  - Bash(chmod *)
  - Bash(http *)
---

# /wallabag:configure — Wallabag Credentials Setup

Writes Wallabag credentials to `~/.claude/channels/wallabag/.env` and
verifies the connection. The credentials file is used by Wallabag tools to
authenticate with the Wallabag API using OAuth2 password grant.

Arguments passed: `$ARGUMENTS`

---

## Credential file format

`~/.claude/channels/wallabag/.env`:

```
WALLABAG_URL=https://app.wallabag.it
WALLABAG_CLIENT_ID=1_abc123
WALLABAG_CLIENT_SECRET=secrethere
WALLABAG_USERNAME=myuser
WALLABAG_PASSWORD=mypassword
```

All five keys are required. Never quote values. `chmod 600` after writing.

---

## Dispatch on arguments

### No args — status and guidance

Read `~/.claude/channels/wallabag/.env` (missing = not configured) and show:

1. **Instance URL** — `WALLABAG_URL`: show the value, or "not set".
2. **Client credentials** — `WALLABAG_CLIENT_ID` and `WALLABAG_CLIENT_SECRET`:
   show set/not-set. If set, show `CLIENT_ID` fully (it is not secret) and
   mask `CLIENT_SECRET` (first 4 chars + `...`).
3. **User credentials** — `WALLABAG_USERNAME`: show the value.
   `WALLABAG_PASSWORD`: show set/not-set only, never expose the value.
4. **Connection test** — if all five keys are present, test the OAuth token
   endpoint. Strip any trailing slash from `WALLABAG_URL` before constructing
   the path:
   ```
   http --ignore-stdin -f POST "${WALLABAG_URL%/}/oauth/v2/token" \
     grant_type=password \
     client_id="$WALLABAG_CLIENT_ID" \
     client_secret="$WALLABAG_CLIENT_SECRET" \
     username="$WALLABAG_USERNAME" \
     password="$WALLABAG_PASSWORD"
   ```
   - Success (HTTP 200, JSON contains `access_token`): show "✓ Connection OK"
   - Failure: show the error and suggest which credential is likely wrong.

5. **What next** — end with a concrete next step based on state:
   - No file or missing keys → show the full setup command syntax (see
     "Guided setup" below) and ask the user to provide values.
   - All set, connection failed → *"Run `/wallabag:configure` again after
     correcting the credential that failed."*
   - All set, connection OK → *"Ready. You can now use Wallabag tools to
     save and manage articles."*

### Guided setup — `setup`

Walk the user through configuring credentials interactively:

1. Explain what each credential is and where to find it:
   - **WALLABAG_URL**: The base URL of the Wallabag instance (e.g.
     `https://app.wallabag.it` or `https://wallabag.example.com`).
   - **WALLABAG_CLIENT_ID** and **WALLABAG_CLIENT_SECRET**: Create an API
     client at `$WALLABAG_URL/developer/client/create`. Use any redirect
     URL (e.g. `https://localhost`). The registration page shows both values.
   - **WALLABAG_USERNAME** and **WALLABAG_PASSWORD**: Regular Wallabag login
     credentials.

2. Ask the user to run the explicit form once they have all values:
   ```
   /wallabag:configure url=<URL> client_id=<ID> client_secret=<SECRET> username=<USER> password=<PASS>
   ```

### Explicit save — `url=<URL> client_id=<ID> client_secret=<SECRET> username=<USER> password=<PASS>`

Parse `$ARGUMENTS` for key=value pairs (space-separated). Accept both forms:
- `url=https://...` and `WALLABAG_URL=https://...` (strip the `WALLABAG_`
  prefix if present, case-insensitive).

Required keys: `url`, `client_id`, `client_secret`, `username`, `password`.

If any key is missing, tell the user which keys are absent and stop.

1. `mkdir -p ~/.claude/channels/wallabag`
2. Read existing `.env` if present; update/add only the provided keys,
   preserve any other keys already in the file.
3. Write back in the format `KEY=value`, no quotes.
4. `chmod 600 ~/.claude/channels/wallabag/.env` — this file contains
   credentials.
5. Strip any trailing slash from the saved `WALLABAG_URL` value before writing
   (store it clean, without trailing slash).
6. Test the connection (same `http` call as in the status check above).
7. Show the result and the full status.

### `clear` — remove all credentials

Delete `~/.claude/channels/wallabag/.env`. Confirm before proceeding by
asking the user: *"This will remove all Wallabag credentials. Are you sure?"*
Only proceed if they confirm.

### `clear <key>` — remove a single credential

Remove only the named key line from the `.env` file. Valid keys: `url`,
`client_id`, `client_secret`, `username`, `password`.

---

## Implementation notes

- Always strip trailing slashes from `WALLABAG_URL` — both when saving and when constructing API URLs — to avoid 404s on the OAuth endpoint.
- The channels dir may not exist on first run. Missing file = not configured,
  not an error.
- Values with spaces must be supported — write them unquoted; the shell does
  not interpret the `.env` file.
- Never log or display the full `WALLABAG_PASSWORD`.
- Always pass `--ignore-stdin` to `http` to prevent it from hanging waiting for stdin.
- If the connection test fails with a TLS error, suggest the user check
  whether their Wallabag URL uses `https://` vs `http://` and whether the
  certificate is valid.
- Wallabag access tokens expire (default 3600 s). This file stores only the
  long-lived OAuth credentials; tools re-authenticate per-request using these
  values — no token caching needed here.
