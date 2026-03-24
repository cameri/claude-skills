---
name: query-dns-stats
description: Query Technitium DNS Server stats and dashboard data — top clients, top domains, query counts, and cache info. Use when the user wants to check DNS stats, top blocked domains, top clients, query rates, or cache status.
user-invocable: true
allowed-tools:
  - Read
  - Bash(http *)
  - Bash(source *)
---

<objective>
Retrieves statistics and dashboard data from the configured Technitium DNS Server instance, including query counts, top clients, top domains, and cache stats.
</objective>

<quick_start>
```
/technitium-dns:query-dns-stats            # summary stats (last hour)
/technitium-dns:query-dns-stats stats day  # stats for last day
/technitium-dns:query-dns-stats top        # all top lists
/technitium-dns:query-dns-stats top blocked limit=20
/technitium-dns:query-dns-stats cache
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
Parse the first word of remaining arguments as the subcommand. Default to `stats` if none given.

**`stats [period=<period>]`** — summary dashboard statistics:

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

**`top [type=<statsType>] [period=<period>] [limit=<n>]`** — top statistics:

Default limit: 10. Default period: `LastDay`.

Valid `statsType` values: `TopClients`, `TopDomains`, `TopBlockedDomains`, `TopUpstreamServers`.
Accept shorthand: `clients` → `TopClients`, `domains` → `TopDomains`, `blocked` → `TopBlockedDomains`, `upstream` → `TopUpstreamServers`.

If `type` is not provided, run all four and display each as a separate section.

```
http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/dashboard/stats/getTop" \
  token=="$TOKEN" statsType=="<statsType>" type=="<period>"
```

Display a numbered list for each type, showing rank, name, and query count.

**`cache`** — show cache stats:

```
http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/cache/stats" \
  token=="$TOKEN"
```

If that endpoint returns 404 or error, try:
```
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/cache/list" \
  token=="$TOKEN"
```

Display total cache entries and any hit/miss stats returned.

**`flush`** — flush the DNS cache:

Confirm first: *"This will flush the entire DNS cache. Are you sure?"*

```
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/cache/flush" \
  token=="$TOKEN"
```

Show success or error.
</workflow>

<notes>
- If `"status": "invalid-token"` is returned, tell the user the session expired and to re-run the command.
- If `"status": "error"`, show `errorMessage`.
- Period names are case-sensitive in the API — always PascalCase.
- Stats data may be empty for newly set up servers with little traffic — show a friendly note in that case.
</notes>

<success_criteria>
- Stats displayed in a readable summary card or numbered list
- Correct period and statsType used based on arguments
- Cache stats shown or fallback endpoint tried
- API errors (invalid-token, error status) surfaced clearly
</success_criteria>
