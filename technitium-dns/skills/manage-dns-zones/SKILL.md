---
name: manage-dns-zones
description: Manage DNS zones on a Technitium DNS Server — list, create, delete, enable, or disable zones. Use when the user wants to view or manage DNS zones, create a new zone, or toggle a zone on/off.
user-invocable: true
allowed-tools:
  - Read
  - Bash(http *)
  - Bash(source *)
---

<objective>
Manages authoritative DNS zones on the configured Technitium DNS Server instance. Supports listing, creating, deleting, enabling, disabling, and exporting zones.
</objective>

<quick_start>
```
/technitium-dns:manage-dns-zones                    # list all zones
/technitium-dns:manage-dns-zones create example.com
/technitium-dns:manage-dns-zones delete example.com
/technitium-dns:manage-dns-zones enable example.com
/technitium-dns:manage-dns-zones disable example.com
/technitium-dns:manage-dns-zones export example.com
```
</quick_start>

<context>
Parse `env=<name>` from `$ARGUMENTS` before any other processing. Strip it from remaining arguments. Default to `""` (empty string). Credential file: `~/.claude/channels/technitium-dns/${ENV}.env`. Omit `env=` from suggested commands when ENV is empty.

Load credentials from the env file. If missing or `TECHNITIUM_URL` is not set, tell the user to run `/technitium-dns:configure-technitium` first.

**Auth token resolution** (before every API call):
- If `TECHNITIUM_TOKEN` is set, use it directly as `$TOKEN`.
- Otherwise call:
  ```
  http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/user/login" user=="$TECHNITIUM_USER" pass=="$TECHNITIUM_PASSWORD"
  ```
  Parse the `token` field from the JSON response.

All subsequent API calls use `token==$TOKEN` as a query parameter.
</context>

<workflow>
Parse the first word of remaining arguments as the subcommand. Default to `list` if none given.

**`list`** (default) — list all authoritative zones:

```
http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/zones/list" token=="$TOKEN"
```

Display a table with columns: **Zone**, **Type**, **Internal**, **Enabled**, **DNSSEC**. Sort by zone name. Show total count at the bottom.

**`create <zone> [type=<type>]`** — create a new zone:

`<zone>` is required. `type` defaults to `Primary`.
Valid types: `Primary`, `Secondary`, `Stub`, `Forwarder`, `SecondaryForwarder`, `Internal`.

```
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/zones/create" \
  token=="$TOKEN" zone=="<zone>" type=="<type>"
```

**`delete <zone>`** — delete a zone:

Confirm first: *"This will permanently delete zone `<zone>`. Are you sure?"* Only proceed if confirmed.

```
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/zones/delete" \
  token=="$TOKEN" zone=="<zone>"
```

**`enable <zone>`** — enable a disabled zone:

```
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/zones/enable" \
  token=="$TOKEN" zone=="<zone>"
```

**`disable <zone>`** — disable a zone without deleting it:

```
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/zones/disable" \
  token=="$TOKEN" zone=="<zone>"
```

**`export <zone>`** — export zone as BIND format zone file:

```
http --ignore-stdin GET "${TECHNITIUM_URL%/}/api/zones/export" \
  token=="$TOKEN" zone=="<zone>"
```

Print the raw zone file content to the user.
</workflow>

<notes>
- Zone names should not have a trailing dot — strip it if the user provides one.
- `type` is case-sensitive — always capitalize the first letter (e.g. `Primary` not `primary`).
- If `"status": "invalid-token"`, tell the user the session expired and suggest re-running or reconfiguring.
- If `"status": "error"`, show the `errorMessage` field.
</notes>

<success_criteria>
- Zone list displayed as a sorted table with all columns
- Create/delete/enable/disable report success or clear error
- Delete requires confirmation before executing
- API errors surfaced with actionable messages
</success_criteria>
