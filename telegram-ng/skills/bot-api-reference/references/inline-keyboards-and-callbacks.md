# Inline keyboards & callback queries

Source: https://core.telegram.org/bots/api — Bot API version 10.2 (released 2026-07-14), fetched live 2026-08-18.

## Reply keyboards vs inline keyboards

Easy to confuse — they solve different problems:

- **`ReplyKeyboardMarkup`** (https://core.telegram.org/bots/api#replykeyboardmarkup) replaces the user's on-screen keyboard with custom buttons. Tapping one **sends its label text as a normal chat message** — visible to everyone in the chat, indistinguishable from the user typing it themselves.
- **`InlineKeyboardMarkup`** (https://core.telegram.org/bots/api#inlinekeyboardmarkup) attaches buttons directly to a specific message. Tapping one fires a **silent `callback_query` update** — no visible message is sent. This is what telegram-ng actually uses (session picker, permission/pairing-approval UI in `server.ts`).

Rule of thumb: reply keyboards are for "give the user quick reply options"; inline keyboards are for "attach actions to this specific message" (approve/deny, pick from a list, page through results) without cluttering the chat log.

### `KeyboardButton` (brief)

At most one of the fields other than `text`, `icon_custom_emoji_id`, and `style` must be set per button.

| Field | Type | Description |
|---|---|---|
| `text` | String | Button label; sent as the message text if pressed with none of the other fields set |
| `icon_custom_emoji_id` | String | *Optional.* Custom emoji shown before the text (Fragment-purchased usernames or Premium bot owners only) |
| `style` | String | *Optional.* `"danger"`, `"success"`, or `"primary"` |
| `request_users` | [KeyboardButtonRequestUsers](https://core.telegram.org/bots/api#keyboardbuttonrequestusers) | *Optional.* Opens a user picker; result arrives as a `users_shared` service message. Private chats only |
| `request_chat` | [KeyboardButtonRequestChat](https://core.telegram.org/bots/api#keyboardbuttonrequestchat) | *Optional.* Opens a chat picker; result arrives as a `chat_shared` service message. Private chats only |
| `request_managed_bot` | [KeyboardButtonRequestManagedBot](https://core.telegram.org/bots/api#keyboardbuttonrequestmanagedbot) | *Optional.* Asks the user to create/share a bot managed by this bot. Private chats only |
| `request_contact` | Boolean | *Optional.* Sends the user's phone number as a contact. Private chats only |
| `request_location` | Boolean | *Optional.* Sends the user's current location. Private chats only |
| `request_poll` | [KeyboardButtonPollType](https://core.telegram.org/bots/api#keyboardbuttonpolltype) | *Optional.* Prompts the user to build and send a poll. Private chats only |
| `web_app` | [WebAppInfo](https://core.telegram.org/bots/api#webappinfo) | *Optional.* Launches a Web App; it can send a `web_app_data` service message. Private chats only |

Not covered in depth here since telegram-ng doesn't use them: `KeyboardButtonRequestUsers`, `KeyboardButtonRequestChat`, `KeyboardButtonRequestManagedBot`, `KeyboardButtonPollType` — see their doc anchors above for full field lists.

### `ReplyKeyboardRemove`

| Field | Type | Description |
|---|---|---|
| `remove_keyboard` | True | Removes the current custom keyboard. To hide-but-keep-accessible instead, use `one_time_keyboard` on `ReplyKeyboardMarkup` |
| `selective` | Boolean | *Optional.* Remove only for @mentioned users / the original sender of a replied-to message |

### `ForceReply`

Displays a reply interface as if the user tapped "Reply" on the bot's message — a way to collect free-text replies without sacrificing privacy mode, without needing a keyboard at all.

| Field | Type | Description |
|---|---|---|
| `force_reply` | True | Shows the reply interface |
| `input_field_placeholder` | String | *Optional.* Placeholder text; 1-64 characters |
| `selective` | Boolean | *Optional.* Force reply only from @mentioned users / the original sender of a replied-to message |

Full docs: [ReplyKeyboardMarkup](https://core.telegram.org/bots/api#replykeyboardmarkup), [KeyboardButton](https://core.telegram.org/bots/api#keyboardbutton), [ReplyKeyboardRemove](https://core.telegram.org/bots/api#replykeyboardremove), [ForceReply](https://core.telegram.org/bots/api#forcereply).

## `InlineKeyboardMarkup`

| Field | Type | Description |
|---|---|---|
| `inline_keyboard` | Array of Array of [InlineKeyboardButton](https://core.telegram.org/bots/api#inlinekeyboardbutton) | Array of button rows, each an array of buttons |

## `InlineKeyboardButton`

> Source's own wording: "Exactly one of the fields other than *text*, *icon_custom_emoji_id*, and *style* must be used to specify the type of the button."

So exactly one of `url` / `callback_data` / `web_app` / `login_url` / `switch_inline_query` / `switch_inline_query_current_chat` / `switch_inline_query_chosen_chat` / `copy_text` / `callback_game` / `pay` must be set per button — never zero, never more than one.

| Field | Type | Description |
|---|---|---|
| `text` | String | Label text on the button |
| `icon_custom_emoji_id` | String | *Optional.* Custom emoji shown before the text (Fragment-purchased usernames or Premium bot owners only) |
| `style` | String | *Optional.* `"danger"`, `"success"`, or `"primary"` |
| `url` | String | *Optional.* HTTP or `tg://` URL opened on press. `tg://user?id=<user_id>` mentions a user by id without a username, if their privacy settings allow it |
| `callback_data` | String | *Optional.* Data sent back to the bot in a [callback query](https://core.telegram.org/bots/api#callbackquery); **1-64 bytes** |
| `web_app` | [WebAppInfo](https://core.telegram.org/bots/api#webappinfo) | *Optional.* Launches a Web App, which can send an arbitrary message via `answerWebAppQuery`. Private chats only; not supported for business-account messages |
| `login_url` | [LoginUrl](https://core.telegram.org/bots/api#loginurl) | *Optional.* HTTPS URL that auto-authorizes the user; replacement for the Telegram Login Widget |
| `switch_inline_query` | String | *Optional.* Prompts the user to pick one of their chats, opens it, and inserts the bot's username + this query into the input field. Empty string inserts just the username. Not supported in channel direct-message chats or business-account messages |
| `switch_inline_query_current_chat` | String | *Optional.* Same, but inserts into the **current** chat's input field instead of prompting a chat picker. Not supported in channels, channel DM chats, or business-account messages |
| `switch_inline_query_chosen_chat` | [SwitchInlineQueryChosenChat](https://core.telegram.org/bots/api#switchinlinequerychosenchat) | *Optional.* Like `switch_inline_query`, but restricts the choosable chat types. Not supported in channel DM chats or business-account messages |
| `copy_text` | [CopyTextButton](https://core.telegram.org/bots/api#copytextbutton) | *Optional.* Copies specified text to the clipboard on press |
| `callback_game` | [CallbackGame](https://core.telegram.org/bots/api#callbackgame) | *Optional.* Launches a game. **Must** be the first button in the first row |
| `pay` | Boolean | *Optional.* Sends a Pay button (invoice messages only). **Must** be the first button in the first row. `⭐`/`XTR` substrings in the label are replaced with a Telegram Star icon |

### `LoginUrl`

| Field | Type | Description |
|---|---|---|
| `url` | String | HTTPS URL opened with auth data appended to the query string on press (or without it, if the user declines). **Must** verify the hash of received data |
| `forward_text` | String | *Optional.* Button text override shown in forwarded messages |
| `bot_username` | String | *Optional.* Bot used for authorization; defaults to the current bot. The `url` domain must match the domain linked to that bot |
| `request_write_access` | Boolean | *Optional.* Requests permission for the bot to message the user |

### `SwitchInlineQueryChosenChat`

| Field | Type | Description |
|---|---|---|
| `query` | String | *Optional.* Default inline query text to insert |
| `allow_user_chats` | Boolean | *Optional.* Allow choosing private user chats |
| `allow_bot_chats` | Boolean | *Optional.* Allow choosing private bot chats |
| `allow_group_chats` | Boolean | *Optional.* Allow choosing group/supergroup chats |
| `allow_channel_chats` | Boolean | *Optional.* Allow choosing channel chats |

### `CopyTextButton`

| Field | Type | Description |
|---|---|---|
| `text` | String | Text copied to the clipboard; 1-256 characters |

Full docs: [InlineKeyboardMarkup](https://core.telegram.org/bots/api#inlinekeyboardmarkup), [InlineKeyboardButton](https://core.telegram.org/bots/api#inlinekeyboardbutton), [LoginUrl](https://core.telegram.org/bots/api#loginurl), [SwitchInlineQueryChosenChat](https://core.telegram.org/bots/api#switchinlinequerychosenchat), [CopyTextButton](https://core.telegram.org/bots/api#copytextbutton).

## `callback_data`: the 1-64 byte budget

`callback_data` is **1-64 bytes**, opaque to Telegram — it round-trips back to the bot verbatim in `CallbackQuery.data` and is never interpreted client-side. Telegram does not validate or template it in any way beyond the byte limit.

Because the budget is so small, any structured state (an action plus an id, e.g. session-resume or a pairing-approval decision) has to be packed compactly rather than JSON-encoded. telegram-ng's own handlers use a `prefix:action:id` convention that fits comfortably:

- `idle:compact` / `idle:pause` / `idle:dismiss` — no id needed, fixed action strings
- `perm:allow:<request_id>` / `perm:deny:<request_id>` / `perm:more:<request_id>` — `request_id` matched with a 5-char `[a-km-z]` regex to keep it short
- session-picker buttons pass a session id (or the `dismiss`/`current` no-op markers) as the raw payload

This is the exact field telegram-ng's `bot.on('callback_query:data', ...)` handler parses (regex-matches the prefix, then dispatches) to decide what to do — see `server.ts` around lines 1213-1267 and 591-638.

## `CallbackQuery`

Fired as the update when a user presses an inline button whose action field is `callback_data` (or `callback_game`).

| Field | Type | Description |
|---|---|---|
| `id` | String | Unique identifier for this query |
| `from` | [User](https://core.telegram.org/bots/api#user) | Sender |
| `message` | [MaybeInaccessibleMessage](https://core.telegram.org/bots/api#maybeinaccessiblemessage) | *Optional.* The bot-sent message the button was attached to |
| `inline_message_id` | String | *Optional.* Identifier of the message sent via the bot in inline mode that the button was attached to |
| `chat_instance` | String | Global identifier, stable per chat, uniquely identifying the chat the callback-button message was sent to. Useful for game high scores |
| `data` | String | *Optional.* The button's `callback_data`. Note: the message that originated the query may no longer contain a button with this data (e.g. it's since been edited) |
| `game_short_name` | String | *Optional.* Short name of a Game to return, unique identifier for the game |

Exactly one of `message` or `inline_message_id` is present, depending on whether the button was attached to a regular bot-sent message or to a message sent via inline mode. Exactly one of `data` or `game_short_name` is present, depending on the button type.

`chat_instance` vs `message`/`inline_message_id`: `chat_instance` is stable and scoped to the chat, independent of which message or button triggered the query — useful as an idempotency/dedup key across multiple callbacks in the same chat. `message.chat.id` (when `message` is present) identifies the chat too, but isn't available at all for inline-mode-originated callbacks, where only `inline_message_id` locates the message and there's no `chat_id` to target.

Full docs: [CallbackQuery](https://core.telegram.org/bots/api#callbackquery).

## `answerCallbackQuery`

Sends the answer to a callback query. On success returns `True`. The answer displays as a notification at the top of the chat screen, or as a modal alert if `show_alert` is set.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `callback_query_id` | String | Yes | Unique identifier for the query to answer |
| `text` | String | Optional | Notification text; 0-200 characters. If omitted, nothing is shown to the user |
| `show_alert` | Boolean | Optional | If `True`, shows a modal alert instead of a top-of-screen notification. Defaults to `False` |
| `url` | String | Optional | URL opened by the user's client. Only works as a game-launch URL if the query came from a `callback_game` button and the bot has an accepted game via `@BotFather` — otherwise use a deep link like `t.me/your_bot?start=XXXX` to open the bot with a parameter |
| `cache_time` | Integer | Optional | Max seconds the client may cache this result client-side. Defaults to `0` |

**Must-call framing** (from the `CallbackQuery` doc's own note): after a user presses a callback button, Telegram clients show a progress/loading spinner on that button **until `answerCallbackQuery` is called**. This means every `callback_query` handler must call it — even with no visible feedback needed (`show_alert: false`, no `text`) — purely to clear the spinner. telegram-ng's handlers follow this: every branch in `bot.on('callback_query:data', ...)` calls `ctx.answerCallbackQuery()` (with or without a `text` label) before or immediately after doing its real work — see `server.ts` lines ~591-638 (`handleIdleCallback`), ~711-742 (`handleSessionButton`), and ~1213-1267 (permission/pairing callbacks).

Full docs: [answerCallbackQuery](https://core.telegram.org/bots/api#answercallbackquery).

## `editMessageReplyMarkup`

Edits only the reply markup (keyboard) of an existing message. On success returns the edited [Message](https://core.telegram.org/bots/api#message) (or `True` for inline messages).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `business_connection_id` | String | Optional | Business connection the original message was sent on behalf of |
| `chat_id` | Integer or String | Optional | Required if `inline_message_id` is not specified. Target chat id, or `@username` for a channel/supergroup |
| `message_id` | Integer | Optional | Required if `inline_message_id` is not specified. Identifier of the message to edit |
| `inline_message_id` | String | Optional | Required if `chat_id` and `message_id` are not specified. Identifier of the inline message |
| `reply_markup` | [InlineKeyboardMarkup](https://core.telegram.org/bots/api#inlinekeyboardmarkup) | Optional | The new inline keyboard |

Needs **either** `chat_id` + `message_id` **or** `inline_message_id` — never both, never neither. Business messages not sent by the bot and without an inline keyboard are only editable within 48 hours of being sent.

Common use: swap or clear a keyboard after its action completes, so the same choice can't be actioned twice — e.g. telegram-ng's callback handlers call `ctx.editMessageText(...)` (which implicitly carries `reply_markup` behavior for grammY's `Context`) to append an outcome label to the original text once a permission/session/idle decision is made, preventing the button from being pressed again for a stale request.

Full docs: [editMessageReplyMarkup](https://core.telegram.org/bots/api#editmessagereplymarkup).

## Gotchas

- **1-64 byte `callback_data` budget.** Forces compact encodings (`prefix:action:id`, not JSON). Long session ids, UUIDs with extra formatting, or verbose action names can blow the limit — truncate or hash if needed.
- **Exactly one action field per `InlineKeyboardButton`.** Setting two of `url`/`callback_data`/`web_app`/`login_url`/`switch_inline_query`/`switch_inline_query_current_chat`/`switch_inline_query_chosen_chat`/`copy_text`/`callback_game`/`pay` (or none) is invalid per the spec's own wording, even though the API may not always reject it loudly.
- **`chat_instance` vs `message.chat.id`.** `chat_instance` is always present and stable per chat regardless of button/message; `message.chat.id` is only available when `message` is present (i.e. not for inline-mode-originated callbacks). Use `chat_instance` for cross-message idempotency keys.
- **Unanswered callback queries leave a stuck spinner.** Any code path in a `callback_query` handler that returns without calling `answerCallbackQuery` (e.g. an early `return` on an error, or an unmatched regex falling through) leaves the tapping user's client showing a loading spinner with no timeout defined in the spec — always answer on every path, including error/rejection branches.
- **Inline-message-originated callbacks have no `chat_id`/`message_id`.** When `inline_message_id` is set instead of `message`, `editMessageReplyMarkup`/`editMessageText` must be called with `inline_message_id` — passing `chat_id`+`message_id` (which don't exist for this case) will fail.
