---
name: call-service
description: Call a Home Assistant service to control devices or trigger automations (e.g. turn lights on, lock doors, run scripts). Use when the user wants to control an entity or invoke a service.
user-invocable: true
allowed-tools:
  - Read
  - Bash(source *)
  - Bash(http *)
---

<objective>
Calls a Home Assistant service via `POST /api/services/<domain>/<service>` using httpie. Returns the list of states that changed as a result.
</objective>

<quick_start>
```
/home-assistant:call-service light.turn_on entity_id=light.living_room brightness=128
/home-assistant:call-service switch.toggle entity_id=switch.fan
/home-assistant:call-service automation.trigger entity_id=automation.morning_routine
/home-assistant:call-service homeassistant.restart
```
</quick_start>

<context>
Load credentials before every call:
```bash
source ~/.claude/channels/home-assistant/.env
```
If `.env` is missing or `HA_URL`/`HA_TOKEN` are not set, tell the user to run `/home-assistant:access` first.

**Auth header:** `Authorization: Bearer $HA_TOKEN`
**Endpoint:** `POST ${HA_URL}/api/services/<domain>/<service>`
**Content-Type:** `application/json`
</context>

<workflow>
Parse `$ARGUMENTS`:
- First arg: `<domain>.<service>` (required) — split on `.` to get domain and service.
- Remaining args: `key=value` pairs → service data payload.

Build the JSON body from remaining `key=value` pairs. Numeric values (no quotes in input) are sent as numbers; everything else as strings. If no extra args, send empty body `{}`.

**Example — `light.turn_on entity_id=light.living_room brightness=128`:**

```bash
http --ignore-stdin -b POST "${HA_URL%/}/api/services/light/turn_on" \
  "Authorization: Bearer $HA_TOKEN" \
  entity_id="light.living_room" \
  brightness:=128
```

(Use `:=` for numeric values in httpie, `=` for strings.)

**Display result:**

- If response is an array of changed states: show a table of **Entity ID**, **New State** for each changed entity.
- If empty array: "Service called successfully. No state changes reported."
- If error: show status code and error message.

**List available services — `call-service list [domain=<domain>]`:**

```bash
http --ignore-stdin -b GET "${HA_URL%/}/api/services" \
  "Authorization: Bearer $HA_TOKEN"
```

Display as: **Domain → Service: description** (if available). Filter by domain if `domain=` provided.
</workflow>

<common_services>
| Service | Description |
|---------|-------------|
| `light.turn_on` | Turn on light (optional: `brightness`, `rgb_color`, `color_temp`) |
| `light.turn_off` | Turn off light |
| `switch.turn_on` / `switch.turn_off` / `switch.toggle` | Control switches |
| `cover.open_cover` / `cover.close_cover` | Garage doors, blinds |
| `climate.set_temperature` | Set thermostat (`temperature=`, `hvac_mode=`) |
| `media_player.play_media` | Play media |
| `automation.trigger` | Trigger an automation |
| `script.turn_on` | Run a script |
| `notify.<notifier>` | Send a notification (`message=`) |
| `homeassistant.reload_all` | Reload all configuration |
</common_services>

<success_criteria>
- Service called with correct domain, service, and data payload
- Changed states displayed in table
- Numeric values sent as numbers (`:=` syntax)
- Missing credentials prompt /home-assistant:access
</success_criteria>
