---
name: get-state
description: Get the current state of one or all Home Assistant entities. Use when the user wants to check an entity's state or attributes, list all entities, or filter by domain.
user-invocable: true
allowed-tools:
  - Read
  - Bash(source *)
  - Bash(http *)
  - Bash(grep *)
---

<objective>
Fetches entity state(s) from Home Assistant via `GET /api/states` or `GET /api/states/<entity_id>` and displays them in a readable format.
</objective>

<quick_start>
```
/home-assistant:get-state light.living_room
/home-assistant:get-state                          # all entities
/home-assistant:get-state domain=light             # filter by domain
```
</quick_start>

<context>
Load credentials before every call:
```bash
source ~/.claude/channels/home-assistant/.env
```
If `.env` is missing or `HA_URL`/`HA_TOKEN` are not set, tell the user to run `/home-assistant:access` first.
</context>

<workflow>
Parse `$ARGUMENTS`:
- No args → list all entities
- First arg matches `domain=<value>` → list all, then filter display by domain prefix
- Otherwise → treat first arg as `<entity_id>`

**Single entity — `get-state <entity_id>`:**

```bash
http --ignore-stdin -b GET "${HA_URL%/}/api/states/<entity_id>" \
  "Authorization: Bearer $HA_TOKEN"
```

Display:
| Field | Value |
|-------|-------|
| Entity ID | `entity_id` |
| State | `state` |
| Last changed | `last_changed` (formatted) |
| Last updated | `last_updated` (formatted) |
| Attributes | formatted key: value list |

If 404: entity not found — suggest checking entity ID with `/home-assistant:get-state domain=<domain>`.

**All entities / domain filter — `get-state` or `get-state domain=<domain>`:**

```bash
http --ignore-stdin -b GET "${HA_URL%/}/api/states" \
  "Authorization: Bearer $HA_TOKEN"
```

Display as a table: **Entity ID**, **State**, **Last Changed**. If domain filter provided, only show entities whose `entity_id` starts with `<domain>.`. Sort by entity ID. Show total count at the bottom.
</workflow>

<success_criteria>
- Single entity: state and all attributes displayed
- All entities: table with count, optionally filtered by domain
- Missing credentials prompt user to run /home-assistant:access
- 404 gives helpful suggestion
</success_criteria>
