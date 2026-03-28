---
name: set-state
description: Create or update the state of a Home Assistant entity. Use when the user wants to set a virtual sensor value, override an entity's state, or create a synthetic entity.
user-invocable: true
allowed-tools:
  - Read
  - Bash(source *)
  - Bash(http *)
---

<objective>
Creates or updates entity state via `POST /api/states/<entity_id>`. This writes directly to HA's state machine — it does not control physical devices (use `call-service` for that). Useful for virtual/input entities and testing.
</objective>

<quick_start>
```
/home-assistant:set-state input_boolean.test_flag on
/home-assistant:set-state sensor.outdoor_temp 22.5 unit_of_measurement=°C device_class=temperature
/home-assistant:set-state binary_sensor.front_door on device_class=door
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
- First arg: `<entity_id>` (required)
- Second arg: `<state>` value (required)
- Remaining args: `key=value` pairs → entity attributes

Build JSON body:
```json
{
  "state": "<state>",
  "attributes": {
    "key": "value",
    ...
  }
}
```

**httpie call:**
```bash
http --ignore-stdin -b POST "${HA_URL%/}/api/states/<entity_id>" \
  "Authorization: Bearer $HA_TOKEN" \
  state="<state>" \
  attributes:='{"key": "value"}'
```

**Display result:**
- 200: "State updated: `<entity_id>` → `<new_state>`"
- 201: "Entity created: `<entity_id>` → `<new_state>`"
- Show full response attributes for confirmation.
- If error: show status code and message.

**Note to user if appropriate:** Setting state via the API bypasses integrations and automations — physical device state may differ. For controlling real devices, use `/home-assistant:call-service`.
</workflow>

<success_criteria>
- POST to /api/states/<entity_id> with correct state and attributes
- 200/201 response displayed clearly with new state
- User warned that this is state machine only, not device control
</success_criteria>
