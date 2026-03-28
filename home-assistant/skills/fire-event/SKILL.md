---
name: fire-event
description: Fire a custom Home Assistant event. Use when the user wants to trigger automations that listen for custom event types, or test event-driven automations.
user-invocable: true
allowed-tools:
  - Read
  - Bash(source *)
  - Bash(http *)
---

<objective>
Fires a Home Assistant event via `POST /api/events/<event_type>` with optional event data. Any automation with a matching event trigger will fire.
</objective>

<quick_start>
```
/home-assistant:fire-event my_custom_event
/home-assistant:fire-event my_custom_event device=front_door action=opened
/home-assistant:fire-event call_service domain=light service=turn_off
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
- First arg: `<event_type>` (required) — the event name (e.g. `my_custom_event`)
- Remaining args: `key=value` pairs → event data payload (optional)

If no additional args, send empty body `{}`.

**httpie call with event data:**
```bash
http --ignore-stdin -b POST "${HA_URL%/}/api/events/<event_type>" \
  "Authorization: Bearer $HA_TOKEN" \
  key="value" \
  key2="value2"
```

**httpie call with no data:**
```bash
http --ignore-stdin -b POST "${HA_URL%/}/api/events/<event_type>" \
  "Authorization: Bearer $HA_TOKEN"
```

**Display result:**
- Success: `{"message": "Event <event_type> fired."}` → show "Event fired: `<event_type>`"
- If event data was sent, echo it back for confirmation.
- Error: show status code and message.

**List active event types — `fire-event list`:**
```bash
http --ignore-stdin -b GET "${HA_URL%/}/api/events" \
  "Authorization: Bearer $HA_TOKEN"
```
Display as table: **Event Type**, **Listener Count**.
</workflow>

<success_criteria>
- POST to /api/events/<event_type> succeeds with 200
- Response message confirmed to user
- Event data echoed back for verification
- `list` subcommand shows all active event types
</success_criteria>
