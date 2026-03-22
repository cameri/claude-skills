---
name: configure
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

# /actual-budget:configure — Configure Actual Budget Connection

Manages connection settings for the user's self-hosted Actual Budget instance.
Credentials are stored in `~/.claude/channels/actual-budget/{env}.env` (chmod 600).

Arguments passed: `$ARGUMENTS`

---

## Environment selection

Parse `env=<name>` from `$ARGUMENTS` before any other processing. Strip it from the
remaining arguments. Default to `""` (empty string) if not provided.

The credential file for the selected environment is:
`~/.claude/channels/actual-budget/${ENV}.env`

When `ENV` is empty the path resolves to `~/.claude/channels/actual-budget/.env`,
which is the default environment and preserves backwards compatibility.
When displaying the environment name, show "(default)" for an empty `ENV`.
When suggesting commands, omit the `env=` argument if `ENV` is empty.

---

## Credential keys

- `SERVER_URL` — base URL of the Actual Budget server (e.g. `https://budget.example.com`)
- `PASSWORD` — server login password used to authenticate
- `SYNC_ID` — budget Sync ID from Settings → Advanced (optional; auto-picks first budget if unset)
- `ENCRYPT_PASSWORD` — budget file encryption password (optional; falls back to `PASSWORD` if unset)

---

## Dispatch on `$ARGUMENTS` (after stripping `env=`)

### No arguments → status check

1. Check if `~/.claude/channels/actual-budget/${ENV}.env` exists.
2. If not: tell the user no credentials are saved for the selected environment and suggest running `/actual-budget:configure setup` (for the default) or `/actual-budget:configure env=$ENV setup` (for a named env).
3. If yes: load the file, show `SERVER_URL` (masked password), then test the connection:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" -X POST "$SERVER_URL/account/login" \
     -H "Content-Type: application/json" \
     -d "{\"password\":\"$PASSWORD\"}"
   ```
   - 200 → connected successfully
   - 400 → wrong password
   - other → server unreachable or unexpected error
4. List all available environments by showing files in `~/.claude/channels/actual-budget/` matching `*.env`, stripping the `.env` suffix. Display `.env` as "(default)".

### `setup` → guided setup

Prompt the user for each credential interactively (one at a time):
1. `SERVER_URL` — ask for the base URL (no trailing slash)
2. `PASSWORD` — ask for the server password

After collecting all values, save and test (same as key=value save below).

### `KEY=VALUE` → save a single credential

Parse the key and value from `$ARGUMENTS`. Valid keys: `SERVER_URL`, `PASSWORD`, `SYNC_ID`, `ENCRYPT_PASSWORD`.
Load existing `${ENV}.env` if present, update the key, write back, chmod 600, then test connection.

### `clear` → remove all credentials for this environment

Delete `~/.claude/channels/actual-budget/${ENV}.env` and confirm.

### `clear KEY` → remove a single key

Remove just that key from the `${ENV}.env` file.

---

## Saving credentials

```bash
mkdir -p ~/.claude/channels/actual-budget
cat > ~/.claude/channels/actual-budget/${ENV}.env <<'EOF'
SERVER_URL=<value>
PASSWORD='<value>'
EOF
chmod 600 ~/.claude/channels/actual-budget/${ENV}.env
```

Note: the password is single-quoted to prevent shell expansion of special characters (`$`, `#`, `@`, etc.).

---

## Connection test

After saving, authenticate and report success or failure:

```bash
source ~/.claude/channels/actual-budget/${ENV}.env
curl -s -X POST "$SERVER_URL/account/login" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"$PASSWORD\"}"
```

A successful response returns HTTP 200 with a JSON body containing a `token` field.
Report the result to the user without printing the token or password.
