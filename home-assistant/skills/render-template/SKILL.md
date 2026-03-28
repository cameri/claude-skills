---
name: render-template
description: Render a Home Assistant Jinja2 template. Use when the user wants to test template expressions, debug automation conditions, or evaluate sensor value transformations.
user-invocable: true
allowed-tools:
  - Read
  - Bash(source *)
  - Bash(http *)
---

<objective>
Renders a Jinja2 template via `POST /api/template` and returns the evaluated output. Supports all HA template functions including `states()`, `is_state()`, `state_attr()`, etc.
</objective>

<quick_start>
```
/home-assistant:render-template "{{ states('sensor.temperature') }}"
/home-assistant:render-template "{{ states('light.living_room') == 'on' }}"
/home-assistant:render-template "{{ state_attr('climate.thermostat', 'current_temperature') }}"
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
- Everything in `$ARGUMENTS` is the template string (required).
- If the user didn't quote it, reconstruct the full string from all args.

**httpie call:**
```bash
http --ignore-stdin -b POST "${HA_URL%/}/api/template" \
  "Authorization: Bearer $HA_TOKEN" \
  template="<template_string>"
```

**Display result:**
- The API returns plain text — the rendered output of the template.
- Show: `Template: <input>` then `Result: <output>`
- If error (400): HA returns the Jinja2 error — display it and suggest fixing the template syntax.

**Common HA template functions to remind the user:**

| Function | Description |
|----------|-------------|
| `states('entity_id')` | Current state value |
| `is_state('entity_id', 'value')` | Boolean state check |
| `state_attr('entity_id', 'attr')` | Get an attribute |
| `now()` | Current datetime |
| `as_timestamp(state)` | Convert to Unix timestamp |
| `float(value, default)` | Cast to float with fallback |
| `int(value, default)` | Cast to int with fallback |
</workflow>

<success_criteria>
- Template rendered and output displayed
- Input template echoed alongside output for clarity
- Jinja2 errors surfaced with the raw HA error message
</success_criteria>
