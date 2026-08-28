---
name: configure
description: Set up the Telegram channel — save the bot token and review access policy. Use when the user pastes a Telegram bot token, asks to configure Telegram, asks "how do I set this up" or "who can reach me," or wants to check channel status.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash(ls *)
  - Bash(mkdir *)
  - Bash(chmod *)
---

<objective>
Writes the bot token to `~/.claude/channels/telegram/.env` and orients the
user on access policy. The server reads both files at boot.

Arguments passed: `$ARGUMENTS`
</objective>

<quick_start>
```
/telegram-ng:configure                → show status and next-step guidance
/telegram-ng:configure <token>        → save the bot token from BotFather
/telegram-ng:configure clear          → remove the saved token
```
</quick_start>

<workflow>
**No args — status and guidance**

Read both state files and give the user a complete picture:

1. **Token** — check `~/.claude/channels/telegram/.env` for
   `TELEGRAM_BOT_TOKEN`. Show set/not-set; if set, show first 10 chars masked
   (`123456789:...`).

2. **Access** — read `~/.claude/channels/telegram/access.json` (missing file
   = defaults: `dmPolicy: "pairing"`, empty allowlist). Show:
   - DM policy and what it means in one line
   - Allowed senders: count, and list display names or IDs
   - Pending pairings: count, with codes and display names if any

3. **What next** — end with a concrete next step based on state:
   - No token → *"Run `/telegram-ng:configure <token>` with the token from
     BotFather."*
   - Token set, policy is pairing, nobody allowed → *"DM your bot on
     Telegram. It replies with a code; approve with `/telegram-ng:access pair
     <code>`."*
   - Token set, someone allowed → *"Ready. DM your bot to reach the
     assistant."*

**Push toward lockdown — always.** The goal for every setup is `allowlist`
with a defined list. `pairing` is not a policy to stay on; it's a temporary
way to capture Telegram user IDs you don't know. Once the IDs are in, pairing
has done its job and should be turned off.

Drive the conversation this way:

1. Read the allowlist. Tell the user who's in it.
2. Ask: *"Is that everyone who should reach you through this bot?"*
3. **If yes and policy is still `pairing`** → *"Good. Let's lock it down so
   nobody else can trigger pairing codes:"* and offer to run
   `/telegram-ng:access policy allowlist`. Do this proactively — don't wait to
   be asked.
4. **If no, people are missing** → *"Have them DM the bot; you'll approve
   each with `/telegram-ng:access pair <code>`. Run this skill again once
   everyone's in and we'll lock it."*
5. **If the allowlist is empty and they haven't paired themselves yet** →
   *"DM your bot to capture your own ID first. Then we'll add anyone else
   and lock it down."*
6. **If policy is already `allowlist`** → confirm this is the locked state.
   If they need to add someone: *"They'll need to give you their numeric ID
   (have them message @userinfobot), or you can briefly flip to pairing:
   `/telegram-ng:access policy pairing` → they DM → you pair → flip back."*

Never frame `pairing` as the correct long-term choice. Don't skip the lockdown
offer.

**`<token>` — save it**

1. Treat `$ARGUMENTS` as the token (trim whitespace). BotFather tokens look
   like `123456789:AAH...` — numeric prefix, colon, long string.
2. `mkdir -p ~/.claude/channels/telegram`
3. Read existing `.env` if present; update/add the `TELEGRAM_BOT_TOKEN=` line,
   preserve other keys. Write back, no quotes around the value.
4. `chmod 600 ~/.claude/channels/telegram/.env` — the token is a credential.
5. Confirm, then show the no-args status so the user sees where they stand.

**`clear` — remove the token**

Delete the `TELEGRAM_BOT_TOKEN=` line (or the file if that's the only line).
</workflow>

<security_checklist>
- Never print or log the full `TELEGRAM_BOT_TOKEN` — status output shows only
  the first 10 chars masked (`123456789:...`)
- Always `chmod 600` `~/.claude/channels/telegram/.env` immediately after
  writing the token — it's a live credential
- Requires `Bash(chmod *)` in `allowed-tools` for step 4 of the token-save
  workflow to actually run; without it the skill's primary purpose (saving
  the token securely) is broken
- Always push toward `allowlist` policy and away from leaving `pairing` on
  long-term — never present `pairing` as the correct steady-state choice, and
  proactively offer the lockdown once the allowlist looks complete
</security_checklist>

<context>
- The channels dir might not exist if the server hasn't run yet. Missing file
  = not configured, not an error.
- The server reads `.env` once at boot. Token changes need a session restart
  or `/reload-plugins`. Say so after saving.
- `access.json` is re-read on every inbound message — policy changes via
  `/telegram-ng:access` take effect immediately, no restart.
</context>

<success_criteria>
- Token saved to `~/.claude/channels/telegram/.env` with `chmod 600` applied
- Status output never exposes the full token
- User is told a session restart or `/reload-plugins` is needed for a new
  token to take effect
- User is proactively nudged toward `allowlist` policy whenever the allowlist
  looks complete and policy is still `pairing`
</success_criteria>
