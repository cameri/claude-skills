---
name: query
description: Query Technitium DNS Server stats and dashboard data — top clients, top domains, query counts, and cache info. Use when the user wants to check DNS stats, top blocked domains, top clients, query rates, or cache status.
user-invocable: true
allowed-tools:
  - Read
  - Bash(http *)
  - Bash(source *)
---

# /technitium-dns:query — DNS Stats and Dashboard

Retrieves statistics and dashboard data from the configured Technitium DNS Server instance.

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

Parse the first word of the remaining arguments as the subcommand. If none given, default to `stats`.

### `stats [period=<period>]`

Get summary dashboard statistics.

Valid periods: `LastHour` (default), `LastDay`, `LastWeek`, `LastMonth`, `LastYear`.
Accept shorthand: `hour` → `LastHour`, `day` → `LastDay`, `week` → `LastWeek`, `month` → `LastMonth`, `year` → `LastYear`.

```
http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/dashboard/stats/get" \
  token=="$TOKEN" type=="<period>"
```

Display a summary card showing:
- **Total Queries**, **Total No Error**, **Total Server Failure**, **Total NX Domain**, **Total Refused**
- **Total Blocked**, **Total Clients**
- **Queries/min** (if available)

### `top [type=<statsType>] [period=<period>] [limit=<n>]`

Get top statistics. Default limit: 10. Default period: `LastDay`.

Valid `statsType` values: `TopClients`, `TopDomains`, `TopBlockedDomains`, `TopUpstreamServers`.
Accept shorthand: `clients` → `TopClients`, `domains` → `TopDomains`, `blocked` → `TopBlockedDomains`, `upstream` → `TopUpstreamServers`.

If `type` is not provided, run all four and display each as a separate section.

```
http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/dashboard/stats/getTop" \
  token=="$TOKEN" statsType=="<statsType>" type=="<period>"
```

Display a numbered list for each type, showing rank, name, and query count.

### `cache`

Show cache stats (entry count and hit rate if available):

```
http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/cache/stats" \
  token=="$TOKEN"
```

If that endpoint is not available (returns 404 or error), try:
```
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/cache/list" \
  token=="$TOKEN"
```

Display total cache entries and any hit/miss stats returned.

### `flush`

Flush the DNS cache. Confirm first: *"This will flush the entire DNS cache. Are you sure?"*

```
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/cache/flush" \
  token=="$TOKEN"
```

Show success or error.

---

## Implementation notes

- If `"status": "invalid-token"` is returned, tell the user the session expired and to re-run the command.
- If `"status": "error"`, show `errorMessage`.
- Period names are case-sensitive in the API — always PascalCase.
- Stats data may be empty for newly set up servers with little traffic — show a friendly note in that case.
