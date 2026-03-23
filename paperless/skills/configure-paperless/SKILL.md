---
name: configure
description: Set up Paperless-ngx credentials — save the instance URL, username, and password. Use when the user wants to configure Paperless-ngx, asks to connect to an instance, asks "how do I set this up," or wants to check current connection status.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash(ls *)
  - Bash(mkdir *)
  - Bash(chmod *)
  - Bash(http *)
---

# /paperless:configure — Paperless-ngx Credentials Setup

Writes Paperless-ngx credentials to `~/.claude/channels/paperless/.env` and
verifies the connection. The credentials file is used by Paperless-ngx tools
to authenticate via token auth (the token is fetched at request time using the
stored username and password).

Arguments passed: `$ARGUMENTS`

---

## Credential file format

`~/.claude/channels/paperless/.env`:

```
PAPERLESS_URL='http://paperless-ngx:8000'
PAPERLESS_USERNAME='myuser'
PAPERLESS_PASSWORD='mypassword'
```

All three keys are required. Single-quote values to prevent shell expansion of
special characters (`$`, `#`, `@`, etc.). `chmod 600` after writing.

---

## Dispatch on arguments

### No args — status and guidance

Read `~/.claude/channels/paperless/.env` (missing = not configured) and show:

1. **Instance URL** — `PAPERLESS_URL`: show the value, or "not set".
2. **Username** — `PAPERLESS_USERNAME`: show the value, or "not set".
3. **Password** — `PAPERLESS_PASSWORD`: show set/not-set only, never expose
   the value.
4. **Connection test** — if all three keys are present, test the token endpoint:
   ```bash
   http --ignore-stdin -b POST "${PAPERLESS_URL%/}/api/token/" \
     username="$PAPERLESS_USERNAME" \
     password="$PAPERLESS_PASSWORD"
   ```
   - Success (HTTP 200, JSON contains `token`): show "✓ Connection OK"
   - Failure: show the error and suggest which credential is likely wrong.

5. **What next** — end with a concrete next step based on state:
   - No file or missing keys → show the full setup command syntax (see
     "Guided setup" below) and ask the user to provide values.
   - All set, connection failed → *"Run `/paperless:configure` again after
     correcting the credential that failed."*
   - All set, connection OK → *"Ready. You can now use `/paperless:upload`
     and `/paperless:search`."*

### Guided setup — `setup`

Walk the user through configuring credentials interactively:

1. Explain what each credential is and where to find it:
   - **PAPERLESS_URL**: The base URL of the Paperless-ngx instance (e.g.
     `http://paperless-ngx:8000` or `https://paperless.example.com`).
   - **PAPERLESS_USERNAME** and **PAPERLESS_PASSWORD**: Regular Paperless-ngx
     login credentials (the same ones used to log into the web UI).

2. Ask the user to run the explicit form once they have all values:
   ```
   /paperless:configure url=<URL> username=<USER> password=<PASS>
   ```

### Explicit save — `url=<URL> username=<USER> password=<PASS>`

Parse `$ARGUMENTS` for key=value pairs (space-separated). Accept both forms:
- `url=https://...` and `PAPERLESS_URL=https://...` (strip the `PAPERLESS_`
  prefix if present, case-insensitive).

Required keys: `url`, `username`, `password`.

If any key is missing, tell the user which keys are absent and stop.

1. `mkdir -p ~/.claude/channels/paperless`
2. Read existing `.env` if present; update/add only the provided keys,
   preserve any other keys already in the file.
3. Write back in the format `KEY='value'` (single-quoted) to prevent shell
   expansion of special characters in passwords.
4. `chmod 600 ~/.claude/channels/paperless/.env` — this file contains
   credentials.
5. Strip any trailing slash from the saved `PAPERLESS_URL` value before
   writing (store it clean, without trailing slash).
6. Test the connection (same `http` call as in the status check above).
7. Show the result and the full status.

### `clear` — remove all credentials

Delete `~/.claude/channels/paperless/.env`. Confirm before proceeding by
asking the user: *"This will remove all Paperless-ngx credentials. Are you
sure?"* Only proceed if they confirm.

### `clear <key>` — remove a single credential

Remove only the named key line from the `.env` file. Valid keys: `url`,
`username`, `password`.

---

## Implementation notes

- Always strip trailing slashes from `PAPERLESS_URL` — both when saving and
  when constructing API URLs — to avoid 404s.
- The channels dir may not exist on first run. Missing file = not configured,
  not an error.
- Single-quote all values in the `.env` file to safely handle passwords
  containing `$`, `#`, `@`, or other shell-special characters.
- Never log or display the full `PAPERLESS_PASSWORD`.
- Always pass `--ignore-stdin` to `http` to prevent it from hanging waiting
  for stdin.
- If the connection test fails with a TLS error, suggest the user check
  whether their Paperless URL uses `https://` vs `http://` and whether the
  certificate is valid.
- Tokens obtained via `/api/token/` are long-lived (DRF token auth). Tools
  re-fetch the token per session as needed using the stored credentials.
