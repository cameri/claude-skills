---
name: zone
description: Manage DNS zones on a Technitium DNS Server — list, create, delete, enable, or disable zones. Use when the user wants to view or manage DNS zones, create a new zone, or toggle a zone on/off.
user-invocable: true
allowed-tools:
  - Read
  - Bash(http *)
  - Bash(source *)
---

# /technitium-dns:zone — Manage DNS Zones

Manages authoritative DNS zones on the configured Technitium DNS Server instance.

Arguments passed: `$ARGUMENTS`

---

## Environment selection

Parse `env=<name>` from `$ARGUMENTS` before any other processing. Strip it from the
remaining arguments. Default to `""` (empty string) if not provided.

The credential file for the selected environment is:
`~/.claude/channels/technitium-dns/${ENV}.env`

When `ENV` is empty the path resolves to `~/.claude/channels/technitium-dns/.env` (the default).
When suggesting commands, omit the `env=` argument if `ENV` is empty.

---

## Setup

Load credentials from `~/.claude/channels/technitium-dns/${ENV}.env`. If the file is
missing or `TECHNITIUM_URL` is not set, tell the user to run `/technitium-dns:configure` first
(include `env=$ENV` in the suggestion only if `ENV` is non-empty).

Resolve an auth token before every API call:
- If `TECHNITIUM_TOKEN` is set in the env file, use it directly as `$TOKEN`.
- Otherwise, call:
  ```
  http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/user/login" user=="$TECHNITIUM_USER" pass=="$TECHNITIUM_PASSWORD"
  ```
  Parse the `token` field from the JSON response and use it as `$TOKEN`.

All subsequent API calls use `token==$TOKEN` as a query parameter.

---

## Dispatch on arguments (after stripping `env=`)

Parse the first word of the remaining arguments as the subcommand. If no subcommand is given, default to `list`.

### `list` (default)

List all authoritative zones:

```
http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/zones/list" token=="$TOKEN"
```

Display a table with columns: **Zone**, **Type**, **Internal**, **Enabled**, **DNSSEC**.
Sort by zone name. Show total count at the bottom.

### `create <zone> [type=<type>]`

Create a new zone. `<zone>` is required. `type` defaults to `Primary`.
Valid types: `Primary`, `Secondary`, `Stub`, `Forwarder`, `SecondaryForwarder`, `Internal`.

```
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/zones/create" \
  token=="$TOKEN" zone=="<zone>" type=="<type>"
```

Show success or the error message.

### `delete <zone>`

Delete a zone. Confirm first: *"This will permanently delete zone `<zone>`. Are you sure?"*
Only proceed if confirmed.

```
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/zones/delete" \
  token=="$TOKEN" zone=="<zone>"
```

### `enable <zone>`

Enable a disabled zone:

```
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/zones/enable" \
  token=="$TOKEN" zone=="<zone>"
```

### `disable <zone>`

Disable a zone (stops serving it without deleting it):

```
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/zones/disable" \
  token=="$TOKEN" zone=="<zone>"
```

### `export <zone>`

Export zone as a zone file (BIND format):

```
http --ignore-stdin GET "${TECHNITIUM_URL%/}/api/zones/export" \
  token=="$TOKEN" zone=="<zone>"
```

Print the raw zone file content to the user.

---

## Implementation notes

- If any API response has `"status": "invalid-token"`, tell the user the session expired and suggest re-running the command (or running `/technitium-dns:configure` if using API token auth; include `env=$ENV` only if `ENV` is non-empty).
- If any API response has `"status": "error"`, show the `errorMessage` field.
- Zone names should not have a trailing dot — strip it if the user provides one.
- `type` is case-sensitive in the API — always capitalize the first letter (e.g. `Primary` not `primary`).
