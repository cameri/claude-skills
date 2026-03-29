---
name: access
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

<objective>
Writes Paperless-ngx credentials to `~/.claude/channels/paperless/.env` and verifies the connection. The credentials file is used by Paperless-ngx tools to authenticate via token auth (the token is fetched at request time using the stored username and password).
</objective>

<quick_start>
Save credentials: `/paperless:access url=<URL> username=<USER> password=<PASS>`

Check status: `/paperless:access` (no args)

Guided setup: `/paperless:access setup`
</quick_start>

<credential_format>
`~/.claude/channels/paperless/.env`:

```
PAPERLESS_URL='http://paperless-ngx:8000'
PAPERLESS_USERNAME='myuser'
PAPERLESS_PASSWORD='mypassword'
```

All three keys are required. Single-quote values to prevent shell expansion of special characters (`$`, `#`, `@`, etc.). `chmod 600` after writing.
</credential_format>

<workflow>
**No args — status and guidance:**

Read `~/.claude/channels/paperless/.env` (missing = not configured) and show:

1. **Instance URL** — `PAPERLESS_URL`: show the value, or "not set".
2. **Username** — `PAPERLESS_USERNAME`: show the value, or "not set".
3. **Password** — `PAPERLESS_PASSWORD`: show set/not-set only, never expose the value.
4. **Connection test** — if all three keys are present, test the token endpoint:
   ```bash
   http --ignore-stdin -b POST "${PAPERLESS_URL%/}/api/token/" \
     username="$PAPERLESS_USERNAME" \
     password="$PAPERLESS_PASSWORD"
   ```
   - Success (HTTP 200, JSON contains `token`): show "✓ Connection OK"
   - Failure: show the error and suggest which credential is likely wrong.
5. **What next** — end with a concrete next step based on state:
   - No file or missing keys → show the full setup command syntax and ask the user to provide values.
   - All set, connection failed → *"Run `/paperless:access` again after correcting the credential that failed."*
   - All set, connection OK → *"Ready. You can now use `/paperless:upload-document` and `/paperless:search-documents`."*

**`setup` — guided setup:**

Walk the user through configuring credentials interactively:

1. Explain what each credential is and where to find it:
   - **PAPERLESS_URL**: The base URL of the Paperless-ngx instance (e.g. `http://paperless-ngx:8000` or `https://paperless.example.com`).
   - **PAPERLESS_USERNAME** and **PAPERLESS_PASSWORD**: Regular Paperless-ngx login credentials (the same ones used to log into the web UI).
2. Ask the user to run the explicit form once they have all values:
   ```
   /paperless:access url=<URL> username=<USER> password=<PASS>
   ```

**`url=<URL> username=<USER> password=<PASS>` — explicit save:**

Parse `$ARGUMENTS` for key=value pairs (space-separated). Accept both forms:
- `url=https://...` and `PAPERLESS_URL=https://...` (strip the `PAPERLESS_` prefix if present, case-insensitive).

Required keys: `url`, `username`, `password`. If any key is missing, tell the user which are absent and stop.

1. `mkdir -p ~/.claude/channels/paperless`
2. Read existing `.env` if present; update/add only the provided keys, preserve any other keys already in the file.
3. Write back in the format `KEY='value'` (single-quoted).
4. `chmod 600 ~/.claude/channels/paperless/.env`
5. Strip any trailing slash from the saved `PAPERLESS_URL` value before writing.
6. Test the connection (same `http` call as in the status check above).
7. Show the result and the full status.

**`clear` — remove all credentials:**

Delete `~/.claude/channels/paperless/.env`. Confirm before proceeding: *"This will remove all Paperless-ngx credentials. Are you sure?"* Only proceed if they confirm.

**`clear <key>` — remove a single credential:**

Remove only the named key line from the `.env` file. Valid keys: `url`, `username`, `password`.
</workflow>

<security_checklist>
- Never log or display `PAPERLESS_PASSWORD` — show set/not-set only
- Always single-quote values in `.env` to safely handle passwords containing `$`, `#`, `@`, or other shell-special characters
- Always `chmod 600` the `.env` file after writing
- Always strip trailing slashes from `PAPERLESS_URL` to avoid 404s
- Always pass `--ignore-stdin` to `http` to prevent hanging on stdin
- If connection test fails with TLS error, suggest checking `https://` vs `http://` and certificate validity
- Missing `.env` file = not configured, not an error — do not create empty files
</security_checklist>

<success_criteria>
- Credentials written to `~/.claude/channels/paperless/.env` with `chmod 600`
- Connection test passes (HTTP 200 with `token` field)
- Status output never exposes the password value
- User knows exactly what to do next based on current state
</success_criteria>
