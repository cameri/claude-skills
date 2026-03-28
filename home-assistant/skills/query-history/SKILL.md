---
name: query-history
description: Query Home Assistant state history or logbook for one or more entities. Use when the user wants to review past states, find when something changed, or audit device activity.
user-invocable: true
allowed-tools:
  - Read
  - Bash(source *)
  - Bash(http *)
---

<objective>
Fetches state history via `GET /api/history/period/<timestamp>` or logbook entries via `GET /api/logbook/<timestamp>`. Supports filtering by entity, time range, and response verbosity.
</objective>

<quick_start>
```
/home-assistant:query-history light.living_room
/home-assistant:query-history light.living_room hours=24
/home-assistant:query-history binary_sensor.front_door hours=48
/home-assistant:query-history logbook hours=6
```
</quick_start>

<context>
Load credentials before every call:
```bash
source ~/.claude/channels/home-assistant/.env
```
If `.env` is missing or `HA_URL`/`HA_TOKEN` are not set, tell the user to run `/home-assistant:access` first.

**Timestamps** are ISO 8601 format: `2024-01-15T00:00:00+00:00`. Compute start time as `now - hours` (default: 24h).
</context>

<workflow>
Parse `$ARGUMENTS`:
- First arg: `<entity_id>` or `logbook` (required)
- `hours=<n>` — lookback window in hours (default: 24)
- `end=<iso_timestamp>` — end time (default: now)

Compute start timestamp from `hours` lookback. Use ISO 8601 format.

**State history — `query-history <entity_id>`:**

```bash
http --ignore-stdin -b GET "${HA_URL%/}/api/history/period/<start_timestamp>" \
  "Authorization: Bearer $HA_TOKEN" \
  filter_entity_id=="<entity_id>" \
  minimal_response==true \
  significant_changes_only==true
```

Response is a nested array. Display a table: **Timestamp**, **State**, **Duration** (time spent in that state until next change).

Show summary at bottom: total state changes, most common state, time in each state (if calculable).

**Logbook — `query-history logbook`:**

```bash
http --ignore-stdin -b GET "${HA_URL%/}/api/logbook/<start_timestamp>" \
  "Authorization: Bearer $HA_TOKEN"
```

Display as table: **Time**, **Entity**, **State/Message**, **Domain**.

Optionally filter by `entity_id=` if provided alongside `logbook`.

**Query parameters reference:**

| Param | Effect |
|-------|--------|
| `minimal_response=true` | Omit attributes from history (faster) |
| `no_attributes=true` | Strip all attributes entirely |
| `significant_changes_only=true` | Skip noise, show meaningful transitions |
| `end_time=<iso>` | End of window (default: now) |
</workflow>

<success_criteria>
- State history displayed as timestamped table with durations
- Logbook entries shown in readable chronological order
- Time range clearly shown in output header
- Empty results handled gracefully ("No history found for this period")
</success_criteria>
