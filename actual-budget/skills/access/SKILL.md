---
name: access
description: Set up Actual Budget credentials — save the server URL and password. Use when the user wants to configure Actual Budget, connect to their instance, or check connection status.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash(curl *)
  - Bash(mkdir *)
  - Bash(chmod *)
  - Bash(cat *)
  - Bash(grep *)
  - Bash(ls *)
---

<objective>
Manages connection settings for the user's self-hosted Actual Budget instance. Credentials are stored in `~/.claude/channels/actual-budget/{env}.env` (chmod 600).
</objective>

<quick_start>
Save credentials: `/actual-budget:access ACTUAL_SERVER_URL=https://budget.example.com`

Check status: `/actual-budget:access` (no args)

Guided setup: `/actual-budget:access setup`
</quick_start>

<context>
Parse `env=<name>` from `$ARGUMENTS` before any other processing. Strip it from remaining arguments. Default to `""` (empty string). Display empty ENV as "(default)". Credential file: `~/.claude/channels/actual-budget/${ENV}.env`. Omit `env=` from suggested commands when ENV is empty.

**Credential keys:**
- `ACTUAL_SERVER_URL` — base URL of the Actual Budget server (e.g. `https://budget.example.com`)
- `ACTUAL_PASSWORD` — server login password used to authenticate
- `ACTUAL_SYNC_ID` — budget Sync ID from Settings → Advanced (optional; auto-picks first budget if unset)

**Migration note:** Older credential files may use `SERVER_URL`, `PASSWORD`, and `SYNC_ID` (without the `ACTUAL_` prefix). These are still recognized by the skills. When saving new or updated credentials, always use the `ACTUAL_` prefixed names.
</context>

<workflow>
**No arguments — status check:**

1. Check if `~/.claude/channels/actual-budget/${ENV}.env` exists.
2. If not: tell the user no credentials are saved and suggest running `/actual-budget:access setup`.
3. If yes: load the file, show `ACTUAL_SERVER_URL` (mask the password), then test the connection:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" -X POST "$ACTUAL_SERVER_URL/account/login" \
     -H "Content-Type: application/json" \
     -d "{\"password\":\"$ACTUAL_PASSWORD\"}"
   ```
   - 200 → connected successfully
   - 400 → wrong password
   - other → server unreachable or unexpected error
4. List all available environments by showing files in `~/.claude/channels/actual-budget/` matching `*.env`, stripping `.env` suffix. Display `.env` as "(default)".

**`setup` — guided setup:**

Prompt the user for each credential interactively:
1. `ACTUAL_SERVER_URL` — ask for the base URL (no trailing slash)
2. `ACTUAL_PASSWORD` — ask for the server password

After collecting all values, save and test (same as key=value save below).

**`KEY=VALUE` — save a single credential:**

Parse the key and value. Valid keys: `ACTUAL_SERVER_URL`, `ACTUAL_PASSWORD`, `ACTUAL_SYNC_ID`.
Load existing `${ENV}.env` if present, update the key, write back, chmod 600, then test connection.

**`clear` — remove all credentials for this environment:**

Delete `~/.claude/channels/actual-budget/${ENV}.env` and confirm.

**`clear KEY` — remove a single key:**

Remove just that key from the `${ENV}.env` file.
</workflow>

<credential_storage>
```bash
mkdir -p ~/.claude/channels/actual-budget
cat > ~/.claude/channels/actual-budget/${ENV}.env <<'EOF'
ACTUAL_SERVER_URL=<value>
ACTUAL_PASSWORD='<value>'
EOF
chmod 600 ~/.claude/channels/actual-budget/${ENV}.env
```

The password is single-quoted to prevent shell expansion of special characters (`$`, `#`, `@`, etc.).
</credential_storage>

<security_checklist>
- Never print or log the `ACTUAL_PASSWORD` or auth token — show set/not-set only
- Always `chmod 600` the `.env` file after writing
- Single-quote the password value to handle special characters safely
- Report connection test result without exposing the token
- When saving, always use `ACTUAL_` prefixed key names
</security_checklist>

<success_criteria>
- Credentials written to `~/.claude/channels/actual-budget/${ENV}.env` with `chmod 600`
- Connection test returns HTTP 200 with a `token` field
- Status output never exposes the password or token
- User knows exactly what to do next based on current state
</success_criteria>
