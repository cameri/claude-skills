---
name: record
description: Manage DNS records on a Technitium DNS Server — add, list, update, or delete A, AAAA, CNAME, MX, TXT, SRV, and other record types. Use when the user wants to add, view, edit, or remove DNS records.
user-invocable: true
allowed-tools:
  - Read
  - Bash(http *)
  - Bash(source *)
---

# /technitium-dns:record — Manage DNS Records

Manages DNS records within zones on the configured Technitium DNS Server instance.

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
- If `TECHNITIUM_TOKEN` is set, use it directly as `$TOKEN`.
- Otherwise call `/api/user/login` with `TECHNITIUM_USER`/`TECHNITIUM_PASSWORD` and parse the `token` field.

---

## Dispatch on arguments (after stripping `env=`)

Parse the first word of the remaining arguments as the subcommand.

### `get <domain> [zone=<zone>] [type=<type>]`

Retrieve records for a domain:

```
http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/zones/records/get" \
  token=="$TOKEN" domain=="<domain>" zone=="<zone>"
```

If `zone` is not provided, omit it (the server infers from the domain).
If `type` is provided, filter the displayed results to that type.

Display a table: **Name**, **Type**, **TTL**, **Value** (formatted per type — e.g. for MX show priority + exchange, for SRV show priority/weight/port/target).

### `add <domain> <type> <value> [zone=<zone>] [ttl=<ttl>] [overwrite=true]`

Add a DNS record. `<domain>`, `<type>`, and `<value>` are required.

Map record types to their API parameters:

| Type  | API parameter(s)                                                |
|-------|-----------------------------------------------------------------|
| A     | `ipAddress=<value>`                                             |
| AAAA  | `ipAddress=<value>`                                             |
| CNAME | `cname=<value>`                                                 |
| PTR   | `ptrName=<value>`                                               |
| MX    | `exchange=<value>` (parse `priority:exchange` from value if colon-separated, default priority 10) |
| TXT   | `text=<value>`                                                  |
| NS    | `nameServer=<value>`                                            |
| SRV   | parse `priority:weight:port:target` from value                  |
| CAA   | parse `flags:tag:value` from value                              |

Build the request dynamically based on type:

```
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/zones/records/add" \
  token=="$TOKEN" \
  domain=="<domain>" \
  zone=="<zone>" \
  type=="<type>" \
  ttl=="<ttl>" \
  overwrite=="<overwrite>" \
  <type-specific params>
```

Omit `zone` if not provided. Default TTL: 3600. Default overwrite: false.

Show success or the error message on failure.

### `delete <domain> <type> [zone=<zone>] [value=<value>]`

Delete a record. `<domain>` and `<type>` are required.

Confirm: *"Delete `<type>` record for `<domain>`? Are you sure?"*

```
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/zones/records/delete" \
  token=="$TOKEN" \
  domain=="<domain>" \
  zone=="<zone>" \
  type=="<type>"
```

Add type-specific value parameters the same way as `add` (to target the correct record when multiple exist).

### `update <domain> <type> <old-value> <new-value> [zone=<zone>] [ttl=<ttl>]`

Update an existing record. Uses `/api/zones/records/update`.
Map old and new values to their API parameters using the same type mapping as `add`
(prefix old params with no prefix; new params prefixed with `new`, e.g. `newIpAddress=`).

```
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/zones/records/update" \
  token=="$TOKEN" \
  domain=="<domain>" \
  zone=="<zone>" \
  type=="<type>" \
  <old-value params> \
  <new-value params> \
  ttl=="<ttl>"
```

---

## Implementation notes

- Record types are case-sensitive in the API — always uppercase (e.g. `A`, `AAAA`, `CNAME`, `MX`, `TXT`).
- If `"status": "invalid-token"` is returned, tell the user the session expired.
- If `"status": "error"`, show `errorMessage`.
- Domain names should not have a trailing dot — strip it if present.
- For TXT records, the value may contain spaces — instruct users to quote the value when passing it.
- When displaying records, truncate long TXT values at 80 characters and indicate truncation with `…`.
