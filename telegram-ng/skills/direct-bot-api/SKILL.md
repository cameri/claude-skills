---
name: direct-bot-api
description: Reply over Telegram through the raw Bot API when the telegram-ng MCP server is disconnected. Use when the telegram-ng MCP tools vanish mid-session (a system-reminder names the server disconnected, or tool search finds no reply/edit tools) while a Telegram-originated turn still owes a reply — degraded-mode fallback, never a replacement for the MCP reply tool.
user-invocable: true
allowed-tools:
  - Read
  - Bash(curl *)
  - Bash(grep *)
---

<objective>
Deliver the reply a Telegram-originated turn owes when the `telegram-ng`
MCP server is down, by POSTing to the Bot API directly. The underlying bot
process is usually still alive even though the MCP client connection
dropped, so one message does not warrant a session restart. Use the MCP
`reply` tool whenever it is available — this is the degraded path, not the
primary one.
</objective>

<quick_start>
1. Confirm the MCP server is actually gone (not a transient tool error).
2. Read the token from `~/.claude/channels/telegram/.env`
   (`TELEGRAM_BOT_TOKEN`).
3. `curl -s -X POST https://api.telegram.org/bot<token>/sendMessage` with
   `chat_id` and `text` (urlencoded).
4. Verify the JSON response contains `"ok":true`.
</quick_start>

<context>
- Token file: `~/.claude/channels/telegram/.env`, key `TELEGRAM_BOT_TOKEN`.
- Endpoint: `https://api.telegram.org/bot<token>/<method>`.
- The `telegram-reply-check` Stop hook blocks ending a Telegram-originated
  turn without a reply — an MCP hiccup must not become a stuck turn or a
  silently dropped notification.
- Confirmed working 2026-08-25: MCP tools were absent from two consecutive
  tool searches; the direct call succeeded immediately (`"ok":true`).
</context>

<workflow>
**Only as a fallback.** First establish that the MCP tools are actually
gone: a `<system-reminder>` names the telegram-ng server disconnected, or
tool search returns no telegram reply/edit tools. A single tool-call error
is not sufficient — retry the MCP call once before falling back.

1. Read `~/.claude/channels/telegram/.env` and extract `TELEGRAM_BOT_TOKEN`
   (the file also holds `CHAT_ID` / `ALLOWED_USER_IDS`; use the chat_id from
   the inbound message, not a configured default, when one is available).
2. Build the request with the bot token in the URL path — never in headers
   or bodies of any other endpoint.
3. Send the reply:

   Text (urlencoded):
   `curl -s -X POST "https://api.telegram.org/bot<token>/sendMessage" --data-urlencode "chat_id=<chat_id>" --data-urlencode "text=<text>" --data-urlencode "parse_mode=HTML"`

   Edit an earlier message (interim progress, corrections):
   `curl -s -X POST "https://api.telegram.org/bot<token>/editMessageText" --data-urlencode "chat_id=<chat_id>" --data-urlencode "message_id=<id>" --data-urlencode "text=<text>"`

   File attachment:
   `curl -s -X POST "https://api.telegram.org/bot<token>/sendDocument" -F "chat_id=<chat_id>" -F "document=@<abs-path>"`

4. Check the JSON response: `"ok":true` means delivered. `"ok":false` —
   surface `description` (e.g. 400 chat not found, 401 bad token) and fix
   or report it; do not claim delivery.
</workflow>

<security_checklist>
- Never print the token, write it into a file, or paste it into docs or
  tests — it stays inside the `.env` read and the curl URL.
- The URL contains the token; keep it out of logs (add `-s` and never
  `-v`), out of shell history concerns (no long-lived shells), and out of
  any error text echoed back.
- `parse_mode=HTML` is the only rich formatting supported; the plugin's
  markdown/rich pipeline, typing indicator, and reactions are unavailable
  in degraded mode — send plain or HTML text, never claim rich formatting.
- This path bypasses the plugin's access control: only use it to reply in
  a conversation that is already in flight from an allowlisted sender.
</security_checklist>

<success_criteria>
- The owed reply is delivered: the Bot API responded `"ok":true` for the
  outbound message.
- The MCP path was genuinely unavailable (tool search confirmed), not
  skipped over a transient error.
- The token never appeared in output, files, or logs.
</success_criteria>
