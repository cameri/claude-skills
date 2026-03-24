---
name: manage-dns-records
description: Manage DNS records on a Technitium DNS Server — add, list, update, or delete A, AAAA, CNAME, MX, TXT, SRV, and other record types. Use when the user wants to add, view, edit, or remove DNS records.
user-invocable: true
allowed-tools:
  - Read
  - Bash(http *)
  - Bash(source *)
---

<objective>
Manages DNS records within zones on the configured Technitium DNS Server instance. Supports get, add, delete, and update operations across all common record types.
</objective>

<quick_start>
```
/technitium-dns:manage-dns-records get example.com
/technitium-dns:manage-dns-records add api.example.com A 192.168.1.10
/technitium-dns:manage-dns-records add example.com MX 10:mail.example.com
/technitium-dns:manage-dns-records delete api.example.com A
/technitium-dns:manage-dns-records update api.example.com A 192.168.1.10 192.168.1.20
```
</quick_start>

<context>
Parse `env=<name>` from `$ARGUMENTS` before any other processing. Strip it from remaining arguments. Default to `""` (empty string). Credential file: `~/.claude/channels/technitium-dns/${ENV}.env`. Omit `env=` from suggested commands when ENV is empty.

Load credentials from the env file. If missing or `TECHNITIUM_URL` is not set, tell the user to run `/technitium-dns:configure-technitium` first.

**Auth token resolution** (before every API call):
- If `TECHNITIUM_TOKEN` is set, use it directly as `$TOKEN`.
- Otherwise call `/api/user/login` with `TECHNITIUM_USER`/`TECHNITIUM_PASSWORD` and parse the `token` field.
</context>

<workflow>
Parse the first word of remaining arguments as the subcommand.

**`get <domain> [zone=<zone>] [type=<type>]`** — retrieve records:

```
http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/zones/records/get" \
  token=="$TOKEN" domain=="<domain>" zone=="<zone>"
```

Omit `zone` if not provided (server infers from domain). Filter displayed results by `type` if provided.

Display a table: **Name**, **Type**, **TTL**, **Value** (formatted per type: MX shows priority + exchange; SRV shows priority/weight/port/target). Truncate TXT values at 80 chars with `…`.

**`add <domain> <type> <value> [zone=<zone>] [ttl=<ttl>] [overwrite=true]`** — add a record:

Record type → API parameter mapping:

| Type  | API parameter(s)                                                |
|-------|-----------------------------------------------------------------|
| A     | `ipAddress=<value>`                                             |
| AAAA  | `ipAddress=<value>`                                             |
| CNAME | `cname=<value>`                                                 |
| PTR   | `ptrName=<value>`                                               |
| MX    | `exchange=<value>` (parse `priority:exchange` if colon-separated, default priority 10) |
| TXT   | `text=<value>`                                                  |
| NS    | `nameServer=<value>`                                            |
| SRV   | parse `priority:weight:port:target` from value                  |
| CAA   | parse `flags:tag:value` from value                              |

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

**`delete <domain> <type> [zone=<zone>] [value=<value>]`** — delete a record:

Confirm: *"Delete `<type>` record for `<domain>`? Are you sure?"*

```
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/zones/records/delete" \
  token=="$TOKEN" \
  domain=="<domain>" \
  zone=="<zone>" \
  type=="<type>"
```

Add type-specific value parameters (same mapping as `add`) to target the correct record when multiple exist.

**`update <domain> <type> <old-value> <new-value> [zone=<zone>] [ttl=<ttl>]`** — update a record:

Uses `/api/zones/records/update`. Map old and new values using the same type mapping as `add`. New params are prefixed with `new` (e.g. `newIpAddress=`).

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
</workflow>

<notes>
- Record types are case-sensitive — always uppercase (e.g. `A`, `AAAA`, `CNAME`, `MX`, `TXT`).
- Domain names should not have a trailing dot — strip it if present.
- For TXT records with spaces in value, instruct users to quote the value when passing it.
- If `"status": "invalid-token"`, tell the user the session expired.
- If `"status": "error"`, show `errorMessage`.
</notes>

<success_criteria>
- Correct subcommand dispatched based on first argument
- Records displayed in a formatted table with type-appropriate value formatting
- Delete/update confirmed before execution
- API errors surfaced with actionable messages
</success_criteria>
