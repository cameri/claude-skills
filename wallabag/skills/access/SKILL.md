---
name: access
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

<objective>
Writes Wallabag credentials to `~/.claude/channels/wallabag/{env}.env` and verifies the connection using OAuth2 password grant. The credentials file is used by Wallabag tools to authenticate with the Wallabag API.
</objective>

<quick_start>
Save credentials: `/wallabag:access url=<URL> client_id=<ID> client_secret=<SECRET> username=<USER> password=<PASS>`

Check status: `/wallabag:access` (no args)

Guided setup: `/wallabag:access setup`
</quick_start>

<context>
Parse `env=<name>` from `$ARGUMENTS` before any other processing. Strip it from remaining arguments. Default to `""` (empty string). Credential file: `~/.claude/channels/wallabag/${ENV}.env`. Display empty ENV as "(default)". Omit `env=` from suggested commands when ENV is empty.
</context>

<credential_format>
`~/.claude/channels/wallabag/${ENV}.env`:

```
WALLABAG_URL=https://app.wallabag.it
WALLABAG_CLIENT_ID=1_abc123
WALLABAG_CLIENT_SECRET=secrethere
WALLABAG_USERNAME=myuser
WALLABAG_PASSWORD=mypassword
```

All five keys are required. Never quote values. `chmod 600` after writing.
</credential_format>

<workflow>
**No args — status and guidance:**

Read `~/.claude/channels/wallabag/${ENV}.env` (missing = not configured) and show:

1. **Environment** — active environment name, or "(default)" if ENV is empty.
2. **Instance URL** — `WALLABAG_URL`: show value, or "not set".
3. **Client credentials** — show CLIENT_ID fully (not secret); mask CLIENT_SECRET (first 4 chars + `...`).
4. **User credentials** — show USERNAME; show PASSWORD as set/not-set only, never expose the value.
5. **Connection test** — if all five keys are present:
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
6. **What next** — concrete next step:
   - No file or missing keys → show full setup command syntax and ask for values.
   - All set, connection failed → *"Run `/wallabag:access env=$ENV` again after correcting the failing credential."*
   - All set, connection OK → *"Ready. You can now use Wallabag tools to save and manage articles."*
7. **Available environments** — list all `*.env` files in `~/.claude/channels/wallabag/`, stripping `.env` suffix. Display `.env` as "(default)".

**`setup` — guided setup:**

1. Explain each credential and where to find it:
   - **WALLABAG_URL**: Base URL (e.g. `https://app.wallabag.it` or `https://wallabag.example.com`).
   - **WALLABAG_CLIENT_ID** and **WALLABAG_CLIENT_SECRET**: Create an API client at `$WALLABAG_URL/developer/client/create`. Use any redirect URL (e.g. `https://localhost`).
   - **WALLABAG_USERNAME** and **WALLABAG_PASSWORD**: Regular Wallabag login credentials.
2. Ask user to run the explicit form once they have all values:
   ```
   /wallabag:access env=$ENV url=<URL> client_id=<ID> client_secret=<SECRET> username=<USER> password=<PASS>
   ```

**Explicit save — `url=<URL> client_id=<ID> client_secret=<SECRET> username=<USER> password=<PASS>`:**

Parse key=value pairs (space-separated). Accept both `url=` and `WALLABAG_URL=` forms (strip `WALLABAG_` prefix if present, case-insensitive).

Required keys: `url`, `client_id`, `client_secret`, `username`, `password`. If any missing, list absent keys and stop.

1. `mkdir -p ~/.claude/channels/wallabag`
2. Read existing `${ENV}.env` if present; update/add provided keys, preserve others.
3. Write back as `KEY=value` (no quotes).
4. `chmod 600 ~/.claude/channels/wallabag/${ENV}.env`
5. Strip trailing slash from `WALLABAG_URL` before writing.
6. Test connection (same as status check).
7. Show result and full status.

**`clear` — remove all credentials for this environment:**

Delete `~/.claude/channels/wallabag/${ENV}.env`. Confirm first: *"This will remove all Wallabag credentials for environment '$ENV'. Are you sure?"* Only proceed if confirmed.

**`clear <key>` — remove a single credential:**

Remove only the named key line from `${ENV}.env`. Valid keys: `url`, `client_id`, `client_secret`, `username`, `password`.
</workflow>

<security_checklist>
- Never log or display `WALLABAG_PASSWORD` — show set/not-set only
- Mask `WALLABAG_CLIENT_SECRET` — show only first 4 chars + `...`
- Always `chmod 600` the `.env` file after writing
- Always strip trailing slashes from `WALLABAG_URL`
- Always pass `--ignore-stdin` to `http` to prevent hanging on stdin
- Wallabag access tokens expire (default 3600s) — tools re-authenticate per-request using stored credentials; no token caching needed
- If TLS error on connection test, suggest checking `https://` vs `http://` and certificate validity
</security_checklist>

<success_criteria>
- Credentials written to `~/.claude/channels/wallabag/${ENV}.env` with `chmod 600`
- OAuth2 token obtained successfully (HTTP 200 with `access_token`)
- Status output never exposes password or full client secret
- User knows exactly what to do next based on current state
</success_criteria>
