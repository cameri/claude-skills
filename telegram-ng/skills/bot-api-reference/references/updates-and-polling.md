# Updates & Polling

Source: https://core.telegram.org/bots/api (Bot API 10.2, fetched 2026-08-18). This is a curated excerpt, not the full spec — follow the links below for anything not covered here.

## Long polling vs webhooks

There are two mutually exclusive ways of receiving updates for a bot: the [getUpdates](https://core.telegram.org/bots/api#getupdates) method (long polling) on one hand, and [webhooks](https://core.telegram.org/bots/api#setwebhook) on the other. Incoming updates are stored on the server until the bot receives them via either method, but they are **not kept longer than 24 hours**.

Regardless of which option is chosen, updates are received as JSON-serialized [Update](https://core.telegram.org/bots/api#update) objects.

- `getUpdates` will not work while an outgoing webhook is set up (see [setWebhook](https://core.telegram.org/bots/api#setwebhook) note 1).
- To switch back to `getUpdates`, call [deleteWebhook](https://core.telegram.org/bots/api#deletewebhook) first.

## The `Update` object

Represents an incoming update. **At most one** of the optional fields can be present in any given update.

| Field | Type | Description |
| --- | --- | --- |
| update_id | Integer | The update's unique identifier. Update identifiers start from a certain positive number and increase sequentially. This identifier becomes especially handy if you're using [webhooks](https://core.telegram.org/bots/api#setwebhook), since it allows you to ignore repeated updates or to restore the correct update sequence, should they get out of order. If there are no new updates for at least a week, then identifier of the next update will be chosen randomly instead of sequentially. |
| message | *Optional*. [Message](https://core.telegram.org/bots/api#message) | New incoming message of any kind - text, photo, sticker, etc. |
| edited_message | *Optional*. [Message](https://core.telegram.org/bots/api#message) | New version of a message that is known to the bot and was edited. This update may at times be triggered by changes to message fields that are either unavailable or not actively used by your bot. |
| channel_post | *Optional*. [Message](https://core.telegram.org/bots/api#message) | New incoming channel post of any kind - text, photo, sticker, etc. |
| edited_channel_post | *Optional*. [Message](https://core.telegram.org/bots/api#message) | New version of a channel post that is known to the bot and was edited. This update may at times be triggered by changes to message fields that are either unavailable or not actively used by your bot. |
| business_connection | *Optional*. [BusinessConnection](https://core.telegram.org/bots/api#businessconnection) | The bot was connected to or disconnected from a business account, or a user edited an existing connection with the bot |
| business_message | *Optional*. [Message](https://core.telegram.org/bots/api#message) | New message from a connected business account |
| edited_business_message | *Optional*. [Message](https://core.telegram.org/bots/api#message) | New version of a message from a connected business account |
| deleted_business_messages | *Optional*. [BusinessMessagesDeleted](https://core.telegram.org/bots/api#businessmessagesdeleted) | Messages were deleted from a connected business account |
| guest_message | *Optional*. [Message](https://core.telegram.org/bots/api#message) | New guest message. The bot can use the field *Message.guest_query_id* and the method [answerGuestQuery](https://core.telegram.org/bots/api#answerguestquery) to send a message in response. |
| message_reaction | *Optional*. [MessageReactionUpdated](https://core.telegram.org/bots/api#messagereactionupdated) | A reaction to a message was changed by a user. The bot must be an administrator in the chat and must explicitly specify `"message_reaction"` in the list of *allowed_updates* to receive these updates. The update isn't received for reactions set by bots. |
| message_reaction_count | *Optional*. [MessageReactionCountUpdated](https://core.telegram.org/bots/api#messagereactioncountupdated) | Reactions to a message with anonymous reactions were changed. The bot must be an administrator in the chat and must explicitly specify `"message_reaction_count"` in the list of *allowed_updates* to receive these updates. The updates are grouped and can be sent with delay up to a few minutes. |
| inline_query | *Optional*. [InlineQuery](https://core.telegram.org/bots/api#inlinequery) | New incoming [inline](https://core.telegram.org/bots/inline) query |
| chosen_inline_result | *Optional*. [ChosenInlineResult](https://core.telegram.org/bots/api#choseninlineresult) | The result of an [inline](https://core.telegram.org/bots/inline) query that was chosen by a user and sent to their chat partner. Please see the documentation on [feedback collecting](https://core.telegram.org/bots/inline#collecting-feedback) for details on how to enable these updates for your bot. |
| callback_query | *Optional*. [CallbackQuery](https://core.telegram.org/bots/api#callbackquery) | New incoming callback query |
| shipping_query | *Optional*. [ShippingQuery](https://core.telegram.org/bots/api#shippingquery) | New incoming shipping query. Only for invoices with flexible price. |
| pre_checkout_query | *Optional*. [PreCheckoutQuery](https://core.telegram.org/bots/api#precheckoutquery) | New incoming pre-checkout query. Contains full information about checkout. |
| purchased_paid_media | *Optional*. [PaidMediaPurchased](https://core.telegram.org/bots/api#paidmediapurchased) | A user purchased paid media with a non-empty payload sent by the bot in a non-channel chat |
| poll | *Optional*. [Poll](https://core.telegram.org/bots/api#poll) | New poll state. Bots receive only updates about manually stopped polls and polls, which are sent by the bot. |
| poll_answer | *Optional*. [PollAnswer](https://core.telegram.org/bots/api#pollanswer) | A user changed their answer in a non-anonymous poll. Bots receive new votes only in polls that were sent by the bot itself. |
| my_chat_member | *Optional*. [ChatMemberUpdated](https://core.telegram.org/bots/api#chatmemberupdated) | The bot's chat member status was updated in a chat. For private chats, this update is received only when the bot is blocked or unblocked by the user. |
| chat_member | *Optional*. [ChatMemberUpdated](https://core.telegram.org/bots/api#chatmemberupdated) | A chat member's status was updated in a chat. The bot must be an administrator in the chat and must explicitly specify `"chat_member"` in the list of *allowed_updates* to receive these updates. |
| chat_join_request | *Optional*. [ChatJoinRequest](https://core.telegram.org/bots/api#chatjoinrequest) | A request to join the chat has been sent. The bot must have the *can_invite_users* administrator right in the chat to receive these updates. |
| chat_boost | *Optional*. [ChatBoostUpdated](https://core.telegram.org/bots/api#chatboostupdated) | A chat boost was added or changed. The bot must be an administrator in the chat to receive these updates. |
| removed_chat_boost | *Optional*. [ChatBoostRemoved](https://core.telegram.org/bots/api#chatboostremoved) | A boost was removed from a chat. The bot must be an administrator in the chat to receive these updates. |
| managed_bot | *Optional*. [ManagedBotUpdated](https://core.telegram.org/bots/api#managedbotupdated) | A new bot was created to be managed by the bot, or token or owner of a managed bot was changed |
| subscription | *Optional*. [BotSubscriptionUpdated](https://core.telegram.org/bots/api#botsubscriptionupdated) | User payment subscription has changed |

## `getUpdates`

Use this method to receive incoming updates using long polling ([wiki](https://en.wikipedia.org/wiki/Push_technology#Long_polling)). Returns an Array of [Update](https://core.telegram.org/bots/api#update) objects.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| offset | Integer | Optional | Identifier of the first update to be returned. Must be greater by one than the highest among the identifiers of previously received updates. By default, updates starting with the earliest unconfirmed update are returned. An update is considered confirmed as soon as [getUpdates](https://core.telegram.org/bots/api#getupdates) is called with an *offset* higher than its *update_id*. The negative offset can be specified to retrieve updates starting from *-offset* update from the end of the updates queue. All previous updates will be forgotten. |
| limit | Integer | Optional | Limits the number of updates to be retrieved. Values between 1-100 are accepted. Defaults to 100. |
| timeout | Integer | Optional | Timeout in seconds for long polling. Defaults to 0, i.e. usual short polling. Should be positive, short polling should be used for testing purposes only. |
| allowed_updates | Array of String | Optional | A JSON-serialized list of the update types you want your bot to receive. For example, specify `["message", "edited_channel_post", "callback_query"]` to only receive updates of these types. See [Update](https://core.telegram.org/bots/api#update) for a complete list of available update types. Specify an empty list to receive all update types except *chat_member*, *message_reaction*, and *message_reaction_count* (default). If not specified, the previous setting will be used. Please note that this parameter doesn't affect updates created before the call to getUpdates, so unwanted updates may be received for a short period of time. |

**Key behaviors:**
- `allowed_updates` is a JSON array of update-type strings (the field names from the `Update` table above).
- Passing an **empty list** means "all updates **except** `chat_member`, `message_reaction`, and `message_reaction_count`" — these three are opt-in only and must be explicitly named to be received.
- Omitting the parameter entirely **keeps the previous setting** (does not reset to default).
- Changes don't apply retroactively — updates already queued before the call may still arrive even if now excluded.

**Notes**
1. This method will not work if an outgoing webhook is set up.
2. In order to avoid getting duplicate updates, recalculate *offset* after each server response.

## `setWebhook`

Use this method to specify a URL and receive incoming updates via an outgoing webhook. Whenever there is an update for the bot, Telegram sends an HTTPS POST request to the specified URL, containing a JSON-serialized [Update](https://core.telegram.org/bots/api#update). In case of an unsuccessful request (a response HTTP status code different from `2XY`), the request is repeated, with give-up after a reasonable number of attempts. Returns *True* on success.

To confirm the webhook was set by you, specify secret data in *secret_token* — the request will then contain a header `X-Telegram-Bot-Api-Secret-Token` with that value.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| url | String | Yes | HTTPS URL to send updates to. Use an empty string to remove webhook integration. |
| certificate | [InputFile](https://core.telegram.org/bots/api#inputfile) | Optional | Upload your public key certificate so that the root certificate in use can be checked. See the [self-signed guide](https://core.telegram.org/bots/self-signed) for details. |
| ip_address | String | Optional | The fixed IP address which will be used to send webhook requests instead of the IP address resolved through DNS |
| max_connections | Integer | Optional | The maximum allowed number of simultaneous HTTPS connections to the webhook for update delivery, 1-100. Defaults to *40*. Use lower values to limit the load on your bot's server, and higher values to increase your bot's throughput. |
| allowed_updates | Array of String | Optional | A JSON-serialized list of the update types you want your bot to receive. For example, specify `["message", "edited_channel_post", "callback_query"]` to only receive updates of these types. See [Update](https://core.telegram.org/bots/api#update) for a complete list of available update types. Specify an empty list to receive all update types except *chat_member*, *message_reaction*, and *message_reaction_count* (default). If not specified, the previous setting will be used. Please note that this parameter doesn't affect updates created before the call to the setWebhook, so unwanted updates may be received for a short period of time. |
| drop_pending_updates | Boolean | Optional | Pass *True* to drop all pending updates |
| secret_token | String | Optional | A secret token to be sent in a header `X-Telegram-Bot-Api-Secret-Token` in every webhook request, 1-256 characters. Only characters `A-Z`, `a-z`, `0-9`, `_` and `-` are allowed. The header is useful to ensure that the request comes from a webhook set by you. |

**Notes**
1. `getUpdates` will not work for as long as an outgoing webhook is set up.
2. To use a self-signed certificate, upload your [public key certificate](https://core.telegram.org/bots/self-signed) using the *certificate* parameter as an `InputFile` — sending a String will not work.
3. Ports currently supported for webhooks: **443, 80, 88, 8443**.

See also: [guide to webhooks](https://core.telegram.org/bots/webhooks).

## `deleteWebhook`

Use this method to remove webhook integration if you decide to switch back to [getUpdates](https://core.telegram.org/bots/api#getupdates). Returns *True* on success.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| drop_pending_updates | Boolean | Optional | Pass *True* to drop all pending updates |

## `getWebhookInfo`

Use this method to get current webhook status. Requires no parameters. On success, returns a [WebhookInfo](https://core.telegram.org/bots/api#webhookinfo) object. If the bot is using [getUpdates](https://core.telegram.org/bots/api#getupdates), returns an object with the *url* field empty.

## `WebhookInfo` object

Describes the current status of a webhook.

| Field | Type | Description |
| --- | --- | --- |
| url | String | Webhook URL, may be empty if webhook is not set up |
| has_custom_certificate | Boolean | *True*, if a custom certificate was provided for webhook certificate checks |
| pending_update_count | Integer | Number of updates awaiting delivery |
| ip_address | *Optional*. String | Currently used webhook IP address |
| last_error_date | *Optional*. Integer | Unix time for the most recent error that happened when trying to deliver an update via webhook |
| last_error_message | *Optional*. String | Error message in human-readable format for the most recent error that happened when trying to deliver an update via webhook |
| last_synchronization_error_date | *Optional*. Integer | Unix time of the most recent error that happened when trying to synchronize available updates with Telegram datacenters |
| max_connections | *Optional*. Integer | The maximum allowed number of simultaneous HTTPS connections to the webhook for update delivery |
| allowed_updates | *Optional*. Array of String | A list of update types the bot is subscribed to. Defaults to all update types except *chat_member*, *message_reaction*, and *message_reaction_count*. |

## Local Bot API Server

Running your own local instance of the Bot API server ([telegram-bot-api](https://github.com/tdlib/telegram-bot-api) source) instead of using `https://api.telegram.org` unlocks:

- Downloading files without a size limit.
- Uploading files up to 2000 MB.
- Uploading files using their local path via [the file URI scheme](https://en.wikipedia.org/wiki/File_URI_scheme).
- Using an HTTP URL for the webhook.
- Using any local IP address for the webhook.
- Using any port for the webhook.
- Setting *max_webhook_connections* up to 100000.
- Receiving the absolute local path as the *file_path* value without needing to download the file after a [getFile](https://core.telegram.org/bots/api#getfile) request.

**Do you need one?** The majority of bots are fine with the default configuration running on Telegram's own servers. Only switch if you specifically need one of the features above.

## Gotchas

- **`chat_member` / `message_reaction` / `message_reaction_count` are opt-in only.** An empty (or omitted-with-no-prior-setting) `allowed_updates` silently excludes all three even though every other update type is included by default. This is the #1 way a bot appears to have a "broken" feature (member-status tracking, reaction tracking) when it's simply never subscribed. Fix: explicitly list the type in `allowed_updates` on both `getUpdates` and `setWebhook`, and the bot must also be an administrator in the chat for `chat_member`, `message_reaction`, `message_reaction_count`, `chat_join_request` (needs `can_invite_users` specifically), and `chat_boost`.
- **`update_id` is not always sequential.** IDs increase sequentially in general, but if there are no new updates for at least a week, the next update's identifier is chosen **randomly** instead of continuing the sequence. Don't assume monotonic-forever IDs when reasoning about gaps.
- **`my_chat_member` vs `chat_member` are different updates.** `my_chat_member` reports changes to the *bot's own* membership/status in a chat (and for private chats, fires only on block/unblock) and requires no special `allowed_updates` entry. `chat_member` reports status changes for *other* members and requires both admin rights in the chat AND explicit `"chat_member"` in `allowed_updates` — easy to confuse when a bot needs to react to other users joining/leaving/being promoted.
- **`getUpdates` and webhooks are mutually exclusive.** Setting a webhook disables `getUpdates` outright; call `deleteWebhook` to go back to polling.
- **`allowed_updates` changes aren't retroactive.** Updates already queued before the `getUpdates`/`setWebhook` call may still be delivered even if the new filter would exclude them.
- **24-hour retention window.** Updates not fetched via `getUpdates` or delivered via webhook are dropped after 24 hours — a long-offline bot can lose updates, not just fall behind.
