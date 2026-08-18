Source: https://core.telegram.org/bots/api (Bot API 10.2, fetched 2026-08-18). This is a curated excerpt — follow the links below for anything not covered here.

# Messages & entities

## Message

The central object: every incoming update and every send/edit method response carries one of these. Nearly all fields are `Optional` — only `message_id`, `date`, and `chat` are guaranteed present.

| Field | Type | Description |
|---|---|---|
| message_id | Integer | Unique message identifier inside this chat; 0 for ephemeral messages or messages the server scheduled instead of sending immediately (unusable until actually sent). |
| message_thread_id | Integer | *Optional*. Identifier of a message thread/forum topic the message belongs to; supergroups and private chats only. |
| direct_messages_topic | [DirectMessagesTopic](https://core.telegram.org/bots/api#directmessagestopic) | *Optional*. Info about the direct-messages chat topic containing the message. |
| from | [User](https://core.telegram.org/bots/api#user) | *Optional*. Sender; may be empty for channel messages. For backward compatibility, messages sent on behalf of a chat get a fake sender user in non-channel chats. |
| sender_chat | [Chat](https://core.telegram.org/bots/api#chat) | *Optional*. Sender when sent on behalf of a chat (e.g. anonymous admin post, or a linked channel forwarding into its discussion group). |
| sender_boost_count | Integer | *Optional*. Number of boosts added by the sender, if they boosted the chat. |
| sender_business_bot | [User](https://core.telegram.org/bots/api#user) | *Optional*. The bot that actually sent the message on behalf of a connected business account (outgoing only). |
| sender_tag | String | *Optional*. Tag/custom title of the sender; supergroups only. |
| receiver_user | [User](https://core.telegram.org/bots/api#user) | *Optional*. For ephemeral messages, the user who received the message. |
| ephemeral_message_id | Integer | *Optional*. Identifier of the ephemeral message inside this chat; may be reused after deletion/expiry. |
| date | Integer | Date the message was sent, Unix time. Always a positive number. |
| guest_query_id | String | *Optional*. Identifier for the guest query; use with [answerGuestQuery](https://core.telegram.org/bots/api#answerguestquery). |
| business_connection_id | String | *Optional*. Identifier of the business connection the message came through. |
| chat | [Chat](https://core.telegram.org/bots/api#chat) | Chat the message belongs to. |
| forward_origin | [MessageOrigin](https://core.telegram.org/bots/api#messageorigin) | *Optional*. Info about the original message, for forwards. |
| is_topic_message | True | *Optional*. True if sent to a topic in a forum supergroup or a private chat with the bot. |
| is_automatic_forward | True | *Optional*. True if a channel post auto-forwarded to the linked discussion group. |
| reply_to_message | [Message](https://core.telegram.org/bots/api#message) | *Optional*. For replies in the same chat/thread, the original message. This nested object will not itself carry a further `reply_to_message`. May be omitted if replying to an ephemeral message. |
| external_reply | [ExternalReplyInfo](https://core.telegram.org/bots/api#externalreplyinfo) | *Optional*. Info about a replied-to message from another chat/topic. |
| quote | [TextQuote](https://core.telegram.org/bots/api#textquote) | *Optional*. For replies quoting part of the original message, the quoted part. |
| reply_to_story | [Story](https://core.telegram.org/bots/api#story) | *Optional*. For replies to a story, the original story. |
| reply_to_checklist_task_id | Integer | *Optional*. Identifier of the checklist task being replied to. |
| reply_to_poll_option_id | String | *Optional*. Persistent identifier of the poll option being replied to. |
| via_bot | [User](https://core.telegram.org/bots/api#user) | *Optional*. Bot through which the message was sent. |
| guest_bot_caller_user | [User](https://core.telegram.org/bots/api#user) | *Optional*. For a guest bot's response, the user whose message triggered it. |
| guest_bot_caller_chat | [Chat](https://core.telegram.org/bots/api#chat) | *Optional*. For a guest bot's response, the chat whose message triggered it. |
| edit_date | Integer | *Optional*. Date the message was last edited, Unix time. |
| has_protected_content | True | *Optional*. True if the message can't be forwarded. |
| is_from_offline | True | *Optional*. True if sent by an implicit action (away/greeting business message, scheduled message). |
| is_paid_post | True | *Optional*. True if a paid post; must not be deleted for 24h to receive payment, can't be edited. |
| media_group_id | String | *Optional*. Identifier grouping this message with other messages in the same media album, unique within the chat. |
| author_signature | String | *Optional*. Post author signature (channels) or custom title of an anonymous group admin. |
| paid_star_count | Integer | *Optional*. Number of Telegram Stars paid by the sender to send this message. |
| text | String | *Optional*. For text messages, the actual UTF-8 text. |
| entities | Array of [MessageEntity](https://core.telegram.org/bots/api#messageentity) | *Optional*. Special entities (usernames, URLs, bot commands, etc.) in `text`. |
| link_preview_options | [LinkPreviewOptions](https://core.telegram.org/bots/api#linkpreviewoptions) | *Optional*. Link preview generation options, if this is a text message with non-default options. |
| suggested_post_info | [SuggestedPostInfo](https://core.telegram.org/bots/api#suggestedpostinfo) | *Optional*. Suggested-post parameters if this is a suggested post in a channel direct-messages chat. |
| effect_id | String | *Optional*. Identifier of the message effect added to the message. |
| rich_message | [RichMessage](https://core.telegram.org/bots/api#richmessage) | *Optional*. Set if the message is a rich formatted message. |
| animation | [Animation](https://core.telegram.org/bots/api#animation) | *Optional*. Animation content. When set, `document` is also set (backward compat). |
| audio | [Audio](https://core.telegram.org/bots/api#audio) | *Optional*. Audio file content. |
| document | [Document](https://core.telegram.org/bots/api#document) | *Optional*. General file content. |
| live_photo | [LivePhoto](https://core.telegram.org/bots/api#livephoto) | *Optional*. Live photo content. When set, `photo` is also set (backward compat). |
| paid_media | [PaidMediaInfo](https://core.telegram.org/bots/api#paidmediainfo) | *Optional*. Paid media content. |
| photo | Array of [PhotoSize](https://core.telegram.org/bots/api#photosize) | *Optional*. Available sizes of the photo. |
| sticker | [Sticker](https://core.telegram.org/bots/api#sticker) | *Optional*. Sticker content. |
| story | [Story](https://core.telegram.org/bots/api#story) | *Optional*. Forwarded story. |
| video | [Video](https://core.telegram.org/bots/api#video) | *Optional*. Video content. |
| video_note | [VideoNote](https://core.telegram.org/bots/api#videonote) | *Optional*. [Video note](https://telegram.org/blog/video-messages-and-telescope) content. |
| voice | [Voice](https://core.telegram.org/bots/api#voice) | *Optional*. Voice message content. |
| caption | String | *Optional*. Caption for animation/audio/document/paid media/photo/video/voice. |
| caption_entities | Array of [MessageEntity](https://core.telegram.org/bots/api#messageentity) | *Optional*. Special entities in `caption`. |
| show_caption_above_media | True | *Optional*. True if the caption must render above the media. |
| has_media_spoiler | True | *Optional*. True if the media is covered by a spoiler animation. |
| checklist | [Checklist](https://core.telegram.org/bots/api#checklist) | *Optional*. Checklist content. |
| contact | [Contact](https://core.telegram.org/bots/api#contact) | *Optional*. Shared contact. |
| dice | [Dice](https://core.telegram.org/bots/api#dice) | *Optional*. Dice with random value. |
| game | [Game](https://core.telegram.org/bots/api#game) | *Optional*. Game content — see [games](https://core.telegram.org/bots/api#games). |
| poll | [Poll](https://core.telegram.org/bots/api#poll) | *Optional*. Native poll. |
| venue | [Venue](https://core.telegram.org/bots/api#venue) | *Optional*. Venue. When set, `location` is also set (backward compat). |
| location | [Location](https://core.telegram.org/bots/api#location) | *Optional*. Shared location. |
| new_chat_members | Array of [User](https://core.telegram.org/bots/api#user) | *Optional*. Members added to the group/supergroup (may include the bot itself). |
| left_chat_member | [User](https://core.telegram.org/bots/api#user) | *Optional*. Member removed (may be the bot itself). |
| chat_owner_left | [ChatOwnerLeft](https://core.telegram.org/bots/api#chatownerleft) | *Optional*. Service message: chat owner left. |
| chat_owner_changed | [ChatOwnerChanged](https://core.telegram.org/bots/api#chatownerchanged) | *Optional*. Service message: chat owner changed. |
| new_chat_title | String | *Optional*. New chat title. |
| new_chat_photo | Array of [PhotoSize](https://core.telegram.org/bots/api#photosize) | *Optional*. New chat photo. |
| delete_chat_photo | True | *Optional*. Service message: chat photo deleted. |
| group_chat_created | True | *Optional*. Service message: group created. |
| supergroup_chat_created | True | *Optional*. Service message: supergroup created. Only ever seen via `reply_to_message` on the first message of a directly-created supergroup. |
| channel_chat_created | True | *Optional*. Service message: channel created. Only ever seen via `reply_to_message` on the first message of a channel. |
| message_auto_delete_timer_changed | [MessageAutoDeleteTimerChanged](https://core.telegram.org/bots/api#messageautodeletetimerchanged) | *Optional*. Service message: auto-delete timer changed. |
| migrate_to_chat_id | Integer | *Optional*. Group migrated to this supergroup id. May exceed 32 bits; safe in a signed 64-bit int or double. |
| migrate_from_chat_id | Integer | *Optional*. Supergroup migrated from this group id. Same size caveat. |
| pinned_message | [MaybeInaccessibleMessage](https://core.telegram.org/bots/api#maybeinaccessiblemessage) | *Optional*. The message that was pinned. Won't itself carry `reply_to_message`. |
| invoice | [Invoice](https://core.telegram.org/bots/api#invoice) | *Optional*. Invoice for a [payment](https://core.telegram.org/bots/api#payments). |
| successful_payment | [SuccessfulPayment](https://core.telegram.org/bots/api#successfulpayment) | *Optional*. Service message: successful payment. |
| refunded_payment | [RefundedPayment](https://core.telegram.org/bots/api#refundedpayment) | *Optional*. Service message: refunded payment. |
| users_shared | [UsersShared](https://core.telegram.org/bots/api#usersshared) | *Optional*. Service message: users shared with the bot. |
| chat_shared | [ChatShared](https://core.telegram.org/bots/api#chatshared) | *Optional*. Service message: a chat was shared with the bot. |
| gift | [GiftInfo](https://core.telegram.org/bots/api#giftinfo) | *Optional*. Service message: regular gift sent/received. |
| unique_gift | [UniqueGiftInfo](https://core.telegram.org/bots/api#uniquegiftinfo) | *Optional*. Service message: unique gift sent/received. |
| gift_upgrade_sent | [GiftInfo](https://core.telegram.org/bots/api#giftinfo) | *Optional*. Service message: a gift's upgrade was purchased after sending. |
| connected_website | String | *Optional*. Domain the user logged into via [Telegram Login](https://core.telegram.org/widgets/login). |
| write_access_allowed | [WriteAccessAllowed](https://core.telegram.org/bots/api#writeaccessallowed) | *Optional*. Service message: user allowed the bot to write after a menu add / Web App launch / [requestWriteAccess](https://core.telegram.org/bots/webapps#initializing-mini-apps). |
| passport_data | [PassportData](https://core.telegram.org/bots/api#passportdata) | *Optional*. Telegram Passport data. |
| proximity_alert_triggered | [ProximityAlertTriggered](https://core.telegram.org/bots/api#proximityalerttriggered) | *Optional*. Service message: proximity alert triggered during Live Location sharing. |
| boost_added | [ChatBoostAdded](https://core.telegram.org/bots/api#chatboostadded) | *Optional*. Service message: user boosted the chat. |
| chat_background_set | [ChatBackground](https://core.telegram.org/bots/api#chatbackground) | *Optional*. Service message: chat background set. |
| checklist_tasks_done | [ChecklistTasksDone](https://core.telegram.org/bots/api#checklisttasksdone) | *Optional*. Service message: checklist tasks marked done/not done. |
| checklist_tasks_added | [ChecklistTasksAdded](https://core.telegram.org/bots/api#checklisttasksadded) | *Optional*. Service message: tasks added to a checklist. |
| community_chat_added | [CommunityChatAdded](https://core.telegram.org/bots/api#communitychatadded) | *Optional*. Service message: chat added to a Community. |
| community_chat_removed | [CommunityChatRemoved](https://core.telegram.org/bots/api#communitychatremoved) | *Optional*. Service message: chat removed from a Community. |
| direct_message_price_changed | [DirectMessagePriceChanged](https://core.telegram.org/bots/api#directmessagepricechanged) | *Optional*. Service message: paid-messages price changed for a channel's direct-messages chat. |
| forum_topic_created | [ForumTopicCreated](https://core.telegram.org/bots/api#forumtopiccreated) | *Optional*. Service message: forum topic created. |
| forum_topic_edited | [ForumTopicEdited](https://core.telegram.org/bots/api#forumtopicedited) | *Optional*. Service message: forum topic edited. |
| forum_topic_closed | [ForumTopicClosed](https://core.telegram.org/bots/api#forumtopicclosed) | *Optional*. Service message: forum topic closed. |
| forum_topic_reopened | [ForumTopicReopened](https://core.telegram.org/bots/api#forumtopicreopened) | *Optional*. Service message: forum topic reopened. |
| general_forum_topic_hidden | [GeneralForumTopicHidden](https://core.telegram.org/bots/api#generalforumtopichidden) | *Optional*. Service message: 'General' topic hidden. |
| general_forum_topic_unhidden | [GeneralForumTopicUnhidden](https://core.telegram.org/bots/api#generalforumtopicunhidden) | *Optional*. Service message: 'General' topic unhidden. |
| giveaway_created | [GiveawayCreated](https://core.telegram.org/bots/api#giveawaycreated) | *Optional*. Service message: scheduled giveaway created. |
| giveaway | [Giveaway](https://core.telegram.org/bots/api#giveaway) | *Optional*. The message is a scheduled giveaway message. |
| giveaway_winners | [GiveawayWinners](https://core.telegram.org/bots/api#giveawaywinners) | *Optional*. A giveaway with public winners completed. |
| giveaway_completed | [GiveawayCompleted](https://core.telegram.org/bots/api#giveawaycompleted) | *Optional*. Service message: a giveaway without public winners completed. |
| managed_bot_created | [ManagedBotCreated](https://core.telegram.org/bots/api#managedbotcreated) | *Optional*. Service message: user created a bot managed by the current bot. |
| paid_message_price_changed | [PaidMessagePriceChanged](https://core.telegram.org/bots/api#paidmessagepricechanged) | *Optional*. Service message: paid-messages price changed for the chat. |
| poll_option_added | [PollOptionAdded](https://core.telegram.org/bots/api#polloptionadded) | *Optional*. Service message: poll answer option added. |
| poll_option_deleted | [PollOptionDeleted](https://core.telegram.org/bots/api#polloptiondeleted) | *Optional*. Service message: poll answer option deleted. |
| suggested_post_approved | [SuggestedPostApproved](https://core.telegram.org/bots/api#suggestedpostapproved) | *Optional*. Service message: suggested post approved. |
| suggested_post_approval_failed | [SuggestedPostApprovalFailed](https://core.telegram.org/bots/api#suggestedpostapprovalfailed) | *Optional*. Service message: suggested-post approval failed. |
| suggested_post_declined | [SuggestedPostDeclined](https://core.telegram.org/bots/api#suggestedpostdeclined) | *Optional*. Service message: suggested post declined. |
| suggested_post_paid | [SuggestedPostPaid](https://core.telegram.org/bots/api#suggestedpostpaid) | *Optional*. Service message: payment for a suggested post received. |
| suggested_post_refunded | [SuggestedPostRefunded](https://core.telegram.org/bots/api#suggestedpostrefunded) | *Optional*. Service message: payment for a suggested post refunded. |
| video_chat_scheduled | [VideoChatScheduled](https://core.telegram.org/bots/api#videochatscheduled) | *Optional*. Service message: video chat scheduled. |
| video_chat_started | [VideoChatStarted](https://core.telegram.org/bots/api#videochatstarted) | *Optional*. Service message: video chat started. |
| video_chat_ended | [VideoChatEnded](https://core.telegram.org/bots/api#videochatended) | *Optional*. Service message: video chat ended. |
| video_chat_participants_invited | [VideoChatParticipantsInvited](https://core.telegram.org/bots/api#videochatparticipantsinvited) | *Optional*. Service message: new participants invited to a video chat. |
| web_app_data | [WebAppData](https://core.telegram.org/bots/api#webappdata) | *Optional*. Service message: data sent by a Web App. |
| reply_markup | [InlineKeyboardMarkup](https://core.telegram.org/bots/api#inlinekeyboardmarkup) | *Optional*. Inline keyboard attached to the message. `login_url` buttons appear as ordinary `url` buttons. |

### MessageId

Just `message_id` (Integer) — a unique message identifier. Same 0-means-unsent-yet caveat as `Message.message_id`.

### InaccessibleMessage

A message that was deleted or is otherwise inaccessible to the bot.

| Field | Type | Description |
|---|---|---|
| chat | [Chat](https://core.telegram.org/bots/api#chat) | Chat the message belonged to. |
| message_id | Integer | Unique message identifier inside the chat. |
| date | Integer | Always 0 — use this to distinguish from a regular message. |

### MaybeInaccessibleMessage

Union: [Message](https://core.telegram.org/bots/api#message) or [InaccessibleMessage](https://core.telegram.org/bots/api#inaccessiblemessage). Used for `pinned_message` and similar fields where the referenced message might have since been deleted.

## MessageEntity

Represents one special entity (hashtag, username, URL, formatting span, etc.) inside `text` or `caption`.

| Field | Type | Description |
|---|---|---|
| type | String | Entity type — see list below. |
| offset | Integer | Offset in **UTF-16 code units** to the start of the entity. |
| length | Integer | Length in **UTF-16 code units**. |
| url | String | *Optional*. For `text_link` only — URL opened when the text is tapped. |
| user | [User](https://core.telegram.org/bots/api#user) | *Optional*. For `text_mention` only — the mentioned user. |
| language | String | *Optional*. For `pre` only — the programming language of the block. |
| custom_emoji_id | String | *Optional*. For `custom_emoji` only — unique id of the custom emoji sticker; resolve with [getCustomEmojiStickers](https://core.telegram.org/bots/api#getcustomemojistickers). |
| unix_time | Integer | *Optional*. For `date_time` only — the Unix time associated with the entity. |
| date_time_format | String | *Optional*. For `date_time` only — the format string (see [date-time entity formatting](https://core.telegram.org/bots/api#date-time-entity-formatting)). |

**`offset`/`length` are UTF-16 code units, not characters and not bytes.** This is the single most common entity-parsing bug. Astral-plane characters (most emoji, many non-Latin scripts' supplementary characters) are represented as a UTF-16 *surrogate pair* — 2 code units — even though they're one grapheme. If you slice `text` using character counts (e.g. Python string indexing, Go runes) or byte counts (e.g. raw UTF-8 byte offsets) instead of UTF-16 units, entity spans will silently misalign whenever the text contains such characters before the entity. JavaScript/TypeScript strings are natively UTF-16, so plain `String.prototype.slice(offset, offset + length)` in Node.js is already correct — this is the one common runtime where no conversion is needed.

### Entity `type` values

| type | Meaning |
|---|---|
| mention | `@username` substring |
| hashtag | `#hashtag` or `#hashtag@chatusername` |
| cashtag | `$USD` or `$USD@chatusername` |
| bot_command | `/start@jobs_bot` |
| url | `https://telegram.org` |
| email | `do-not-reply@telegram.org` |
| phone_number | `+1-212-555-0123` |
| bold | **bold text** |
| italic | *italic text* |
| underline | underlined text |
| strikethrough | strikethrough text |
| spoiler | spoiler message (hidden until tapped) |
| blockquote | block quotation |
| expandable_blockquote | collapsed-by-default block quotation |
| code | monowidth string |
| pre | monowidth block |
| text_link | clickable text URL |
| text_mention | mention of a user [without a username](https://telegram.org/blog/edit#new-mentions), via an embedded `user` object |
| custom_emoji | inline custom emoji sticker |
| date_time | formatted date/time (see [date-time entity formatting](https://core.telegram.org/bots/api#date-time-entity-formatting)) |

### `mention` vs `text_mention`

- **`mention`**: a plain `@username` substring that literally appears inside `text`. The entity just marks the span (`offset`/`length`); it carries no `user` field. Telegram clients resolve the `@username` to a user client-side — the bot has to compare the substring text itself (case-insensitively) against a known username to know who's mentioned.
- **`text_mention`**: used to mention a user who **has no username** — there's no `@handle` text to put in the message, so the entity instead carries a real embedded `user` object directly. The visible text is just a name/label chosen by the sender; the entity's `user` field is the actual link.

Practical consequence: detecting "was my bot mentioned" requires checking *both* entity types — a `mention` entity's text slice against your bot's `@username`, and a `text_mention` entity's `user.username`/`user.is_bot` fields, since a userless mention never appears as literal `@`-text.

**Why this matters here:** `telegram-ng`'s `isMentioned()` in `server.ts` (around lines 323-337) does exactly this — it walks `ctx.message.entities` (falling back to `caption_entities`), checks `e.type === 'mention'` by slicing `text.slice(e.offset, e.offset + e.length)` and comparing case-insensitively to `@${botUsername}`, and separately checks `e.type === 'text_mention' && e.user?.is_bot && e.user.username === botUsername`. It also treats a reply to one of the bot's own messages as an implicit mention. Missing either entity-type branch would silently break mention-gated group replies for one of the two mention forms.

## TextQuote

Describes the quoted part of a message that another message replies to (i.e. what `Message.quote` carries).

| Field | Type | Description |
|---|---|---|
| text | String | Text of the quoted part. |
| entities | Array of [MessageEntity](https://core.telegram.org/bots/api#messageentity) | *Optional*. Only *bold*, *italic*, *underline*, *strikethrough*, *spoiler*, *custom_emoji*, and *date_time* entities are kept in quotes. |
| position | Integer | Approximate quote position in the original message, in UTF-16 code units, as specified by the sender. |
| is_manual | True | *Optional*. True if the sender chose the quote manually; otherwise the server added it automatically. |

## ExternalReplyInfo

Describes a message being replied to that comes from another chat or forum topic (`Message.external_reply`). Distinct from `reply_to_message` (same-chat reply) and from `TextQuote` (a substring quote of the replied-to message) — `ExternalReplyInfo` is "the replied-to message lives somewhere else, here's a snapshot of what it was."

| Field | Type | Description |
|---|---|---|
| origin | [MessageOrigin](https://core.telegram.org/bots/api#messageorigin) | Origin of the message replied to. |
| chat | [Chat](https://core.telegram.org/bots/api#chat) | *Optional*. Chat the original message belongs to; only if it's a supergroup or channel. |
| message_id | Integer | *Optional*. Identifier inside the original chat; only if it's a supergroup or channel. |
| link_preview_options | [LinkPreviewOptions](https://core.telegram.org/bots/api#linkpreviewoptions) | *Optional*. Link preview options for the original message, if a text message. |
| animation / audio / document / live_photo / paid_media / photo / sticker / story / video / video_note / voice | (respective type) | *Optional*. Mirrors the corresponding `Message` media field for the original message. |
| has_media_spoiler | True | *Optional*. True if the original media had a spoiler cover. |
| checklist / contact / dice / game / giveaway / giveaway_winners / invoice / location / poll / venue | (respective type) | *Optional*. Mirrors the corresponding `Message` content field for the original message. |

## ReplyParameters

Describes reply parameters for a message being sent (the `reply_parameters` param on send methods).

| Field | Type | Description |
|---|---|---|
| message_id | Integer | *Optional*. Message to reply to in the current chat (or `chat_id` if given). Required unless `ephemeral_message_id` is given. |
| chat_id | Integer or String | *Optional*. If replying to a message in a different chat, its id or `@username`. Not supported for business-account messages, channel direct-messages chats, or ephemeral messages. |
| ephemeral_message_id | Integer | *Optional*. Identifier of an incoming ephemeral message to reply to. A reply to an ephemeral message must itself be ephemeral, and only within 15 seconds of the original being sent. Required unless `message_id` is given. |
| allow_sending_without_reply | Boolean | *Optional*. Send anyway if the target message isn't found. Always `False` for cross-chat/forum-topic replies and sent ephemeral messages; always `True` for business-account messages. |
| quote | String | *Optional*. Quoted substring, 0-1024 chars after entity parsing. Must be an *exact* substring of the target message (including its bold/italic/underline/strikethrough/spoiler/custom_emoji/date_time entities). Send fails if not found. Ignored for ephemeral messages. |
| quote_parse_mode | String | *Optional*. Parse mode for `quote`. See [formatting options](https://core.telegram.org/bots/api#formatting-options). |
| quote_entities | Array of [MessageEntity](https://core.telegram.org/bots/api#messageentity) | *Optional*. Explicit entities for `quote`, instead of `quote_parse_mode`. |
| quote_position | Integer | *Optional*. Position of the quote in the original message, UTF-16 code units. |
| checklist_task_id | Integer | *Optional*. Specific checklist task to reply to. |
| poll_option_id | String | *Optional*. Specific poll option to reply to. |

## MessageOrigin family

`MessageOrigin` is a union describing where a forwarded (or externally-replied-to) message actually came from — it's what makes `forward_origin` and `ExternalReplyInfo.origin` meaningful. All four variants share `type` and `date` (Unix time the message was *originally* sent); they differ in what identifies the source:

- **MessageOriginUser** (`type: "user"`) — a known sender; carries `sender_user` ([User](https://core.telegram.org/bots/api#user)).
- **MessageOriginHiddenUser** (`type: "hidden_user"`) — sender chose to hide their account; carries only `sender_user_name` (String), no linkable `User`.
- **MessageOriginChat** (`type: "chat"`) — sent on behalf of a chat into a group; carries `sender_chat` ([Chat](https://core.telegram.org/bots/api#chat)) and *optional* `author_signature` (anonymous admin's signature).
- **MessageOriginChannel** (`type: "channel"`) — sent to a channel; carries `chat` (the channel), `message_id` (inside that channel), and *optional* `author_signature`.

Use `type` as the discriminant field when narrowing.

## Formatting options / parse modes

The Bot API supports bold/italic/underline/strikethrough/spoiler/blockquote text, inline links, and pre-formatted code. Specify formatting either via an explicit `entities`/`caption_entities` array, or via `parse_mode` + markup syntax in the raw string — **`parse_mode` and `entities` are mutually exclusive**: passing `entities` lets you skip `parse_mode` entirely, and you should not combine markup syntax with an explicit entities array for the same field.

Telegram clients show a confirmation alert ("Open this link?" with the full URL) before opening any inline link.

**Nesting rules** (entities generally, regardless of parse mode):
- If two entities share characters, one must be fully contained inside the other — no partial overlap.
- `bold`, `italic`, `underline`, `strikethrough`, and `spoiler` can contain, and be contained in, any other entity type except `pre` and `code`.
- `blockquote` and `expandable_blockquote` can't be nested (in each other or anything else, per the "all other entities can't contain each other" rule below them).
- All other entity types can't contain each other.

`tg://user?id=<user_id>` links mention a user by id without a username. They only work inside an inline link or inline-keyboard button (not in plain message text), and are only guaranteed to resolve if the user has DMed the bot before, or sent a callback query via an inline button, and doesn't have Forwarded Messages privacy enabled against the bot — unless they're a member of the chat where they're mentioned.

Supported code-block languages for syntax highlighting: see [libprisma#supported-languages](https://github.com/TelegramMessenger/libprisma#supported-languages).

### Date-time entity formatting

The `date_time_format` string must match `r|w?[dD]?[tT]?`. Empty = display the underlying text as-is (client may still localize the date). Control characters:

- `r` — relative to current time; can't combine with anything else.
- `w` — day of week, localized.
- `d` — short date (e.g. "17.03.22").
- `D` — long date (e.g. "March 17, 2022").
- `t` — short time (e.g. "22:45").
- `T` — long time (e.g. "22:45:00").

### MarkdownV2 style

Pass `MarkdownV2` as `parse_mode`.

```
*bold \*text*
_italic \*text_
__underline__
~strikethrough~
||spoiler||
*bold _italic bold ~italic bold strikethrough ||italic bold strikethrough spoiler||~ __underline italic bold___ bold*
[inline URL](http://www.example.com/)
[inline mention of a user](tg://user?id=123456789)
![](tg://emoji?id=5368324170671202286)
![22:45 tomorrow](tg://time?unix=1647531900&format=wDT)
`inline fixed-width code`
```
pre-formatted fixed-width code block
```
```python
pre-formatted code, language-tagged
```
>Block quotation
>continued
**>Expandable block quotation starts right after another blockquote
>separated from it by an empty bold entity
>hidden-by-default part starts here
>last line with the expandability mark||
```

Rules (exact, from source):
- Any character with code 1–126 can be escaped anywhere with a preceding `\`, making it literal — so `\` itself usually needs escaping.
- Inside `pre` and `code` entities, all `` ` `` and `\` must be escaped with a preceding `\`.
- Inside the `(...)` part of an inline link or custom-emoji definition, all `)` and `\` must be escaped with a preceding `\`.
- Everywhere else, these must be escaped with a preceding `\`: `_ * [ ] ( ) ~ \` > # + - = | { } . !`
- `__` is greedily parsed left-to-right as the start/end of an `underline` entity. To get literal `italic` immediately followed by `underline` (`___italic underline___`), insert an empty bold entity as a separator: `___italic underline_**__`.
- Custom emoji needs a valid emoji as the alt-text value; it displays instead of the custom emoji where custom emoji can't render (system notifications, or forwards by non-Premium users). Prefer the emoji from the custom emoji sticker's own `emoji` field.
- Custom emoji entities only work for bots that bought extra usernames on [Fragment](https://fragment.com), or in messages the bot sends directly to private/group/supergroup chats if the bot owner has Telegram Premium.

### HTML style

Pass `HTML` as `parse_mode`. Supported tags:

```
<b>bold</b>, <strong>bold</strong>
<i>italic</i>, <em>italic</em>
<u>underline</u>, <ins>underline</ins>
<s>strikethrough</s>, <strike>strikethrough</strike>, <del>strikethrough</del>
<span class="tg-spoiler">spoiler</span>, <tg-spoiler>spoiler</tg-spoiler>
<a href="http://www.example.com/">inline URL</a>
<a href="tg://user?id=123456789">inline mention of a user</a>
<tg-emoji emoji-id="5368324170671202286">👍</tg-emoji>
<tg-time unix="1647531900" format="wDT">22:45 tomorrow</tg-time>
<code>inline fixed-width code</code>
<pre>pre-formatted fixed-width code block</pre>
<pre><code class="language-python">code, language-tagged</code></pre>
<blockquote>Block quotation</blockquote>
<blockquote expandable>Expandable block quotation</blockquote>
```
Tags nest, e.g. `<b>bold <i>italic bold <s>...</s> <u>...</u></i> bold</b>`.

Rules (exact, from source):
- Only the tags above are supported.
- Any `<`, `>`, or `&` not part of a tag/entity must be replaced with `&lt;`, `&gt;`, `&amp;` respectively.
- All numerical HTML entities are supported. Only these named entities: `&lt;`, `&gt;`, `&amp;`, `&quot;`.
- Nest `<code>` inside `<pre>` to set a `pre` block's programming language (`<pre><code class="language-xxx">…</code></pre>`) — a standalone `<code>` tag can't carry a language.
- Custom emoji content must be a valid emoji (same fallback-display rule as MarkdownV2); same Fragment/Premium usage restriction applies.

### Markdown style (legacy)

Pass `Markdown` as `parse_mode`. Retained only for backward compatibility — prefer MarkdownV2.

```
*bold text*
_italic text_
[inline URL](http://www.example.com/)
[inline mention of a user](tg://user?id=123456789)
`inline fixed-width code`
```
pre-formatted fixed-width code block
```
```python
pre-formatted code, language-tagged
```
```

Rules (exact, from source):
- **Entities must not be nested** — use MarkdownV2 if you need nesting.
- No way to express underline, strikethrough, spoiler, blockquote, expandable_blockquote, custom_emoji, or date_time — use MarkdownV2 for those.
- Escape `_ * \` [` outside of an entity with a preceding `\`.
- **Escaping inside entities is not allowed** — close the entity and reopen it instead: italic `snake_case` is `_snake_\__case_`; bold `2*2=4` is `*2*\**2=4*`.

## sendMessage

Sends a text message; returns the sent [Message](https://core.telegram.org/bots/api#message) on success.

| Parameter | Type | Required | Description |
|---|---|---|---|
| business_connection_id | String | Optional | Business connection on whose behalf to send. |
| chat_id | Integer or String | Yes | Target chat id or `@username`. |
| message_thread_id | Integer | Optional | Target forum topic; forum supergroups and bot-DM-topic-mode-enabled private chats only. |
| direct_messages_topic_id | Integer | Optional | Target direct-messages topic; required for direct-messages chats. |
| receiver_user_id | Integer | Optional | For outgoing ephemeral messages, the receiving user (group/supergroup only); delivery not guaranteed if offline. |
| callback_query_id | String | Optional | For outgoing ephemeral messages, the callback query that triggered it, if any. |
| text | String | Yes | Message text, 1-4096 characters after entity parsing. |
| parse_mode | String | Optional | Entity parse mode — see [formatting options](https://core.telegram.org/bots/api#formatting-options). |
| entities | Array of [MessageEntity](https://core.telegram.org/bots/api#messageentity) | Optional | Explicit entities, instead of `parse_mode`. |
| link_preview_options | [LinkPreviewOptions](https://core.telegram.org/bots/api#linkpreviewoptions) | Optional | Link preview generation options. |
| disable_notification | Boolean | Optional | Send [silently](https://telegram.org/blog/channels-2-0#silent-messages) (no sound). |
| protect_content | Boolean | Optional | Protect content from forwarding/saving. |
| allow_paid_broadcast | Boolean | Optional | Allow up to 1000 msg/s past normal broadcast limits, at 0.1 Stars/message withdrawn from the bot's balance. |
| message_effect_id | String | Optional | Message effect id; private chats only. |
| suggested_post_parameters | [SuggestedPostParameters](https://core.telegram.org/bots/api#suggestedpostparameters) | Optional | Suggested-post parameters; direct-messages chats only. Replying to another suggested post auto-declines it. |
| reply_parameters | [ReplyParameters](https://core.telegram.org/bots/api#replyparameters) | Optional | Description of the message being replied to. |
| reply_markup | [InlineKeyboardMarkup](https://core.telegram.org/bots/api#inlinekeyboardmarkup) or [ReplyKeyboardMarkup](https://core.telegram.org/bots/api#replykeyboardmarkup) or [ReplyKeyboardRemove](https://core.telegram.org/bots/api#replykeyboardremove) or [ForceReply](https://core.telegram.org/bots/api#forcereply) | Optional | Inline keyboard, custom reply keyboard, keyboard removal, or forced reply. |

## Editing and deleting

### editMessageText

Edits text/rich/game messages. Returns the edited [Message](https://core.telegram.org/bots/api#message) unless editing an inline message, in which case returns `True`. Business messages the bot didn't send, without an inline keyboard, can only be edited within **48 hours** of being sent.

| Parameter | Type | Required | Description |
|---|---|---|---|
| business_connection_id | String | Optional | Business connection on whose behalf the original message was sent. |
| chat_id | Integer or String | Optional | Required if `inline_message_id` isn't given. |
| message_id | Integer | Optional | Required if `inline_message_id` isn't given. |
| inline_message_id | String | Optional | Required if `chat_id`+`message_id` aren't given. |
| text | String | Optional | New text, 1-4096 chars after entity parsing; required if `rich_message` isn't given. |
| parse_mode | String | Optional | See [formatting options](https://core.telegram.org/bots/api#formatting-options). |
| entities | Array of [MessageEntity](https://core.telegram.org/bots/api#messageentity) | Optional | Instead of `parse_mode`. |
| link_preview_options | [LinkPreviewOptions](https://core.telegram.org/bots/api#linkpreviewoptions) | Optional | Link preview options. |
| rich_message | [InputRichMessage](https://core.telegram.org/bots/api#inputrichmessage) | Optional | New rich content; required if `text` isn't given. Can't upload new files when editing an inline message. |
| reply_markup | [InlineKeyboardMarkup](https://core.telegram.org/bots/api#inlinekeyboardmarkup) | Optional | New inline keyboard. |

### editMessageCaption

Edits a message's caption. Same return/48-hour rules as above.

| Parameter | Type | Required | Description |
|---|---|---|---|
| business_connection_id | String | Optional | As above. |
| chat_id | Integer or String | Optional | Required if `inline_message_id` isn't given. |
| message_id | Integer | Optional | Required if `inline_message_id` isn't given. |
| inline_message_id | String | Optional | Required if `chat_id`+`message_id` aren't given. |
| caption | String | Optional | New caption, 0-1024 chars after entity parsing. |
| parse_mode | String | Optional | See [formatting options](https://core.telegram.org/bots/api#formatting-options). |
| caption_entities | Array of [MessageEntity](https://core.telegram.org/bots/api#messageentity) | Optional | Instead of `parse_mode`. |
| show_caption_above_media | Boolean | Optional | Show caption above media; animation/photo/video only. |
| reply_markup | [InlineKeyboardMarkup](https://core.telegram.org/bots/api#inlinekeyboardmarkup) | Optional | New inline keyboard. |

### editMessageReplyMarkup

Edits only the reply markup. Same return/48-hour rules as above.

| Parameter | Type | Required | Description |
|---|---|---|---|
| business_connection_id | String | Optional | As above. |
| chat_id | Integer or String | Optional | Required if `inline_message_id` isn't given. |
| message_id | Integer | Optional | Required if `inline_message_id` isn't given. |
| inline_message_id | String | Optional | Required if `chat_id`+`message_id` aren't given. |
| reply_markup | [InlineKeyboardMarkup](https://core.telegram.org/bots/api#inlinekeyboardmarkup) | Optional | New inline keyboard. |

All three edit methods require **either** (`chat_id` + `message_id`) **or** `inline_message_id` — never both, never neither.

### deleteMessage

Deletes a message (including service messages). Returns `True`.

| Parameter | Type | Required | Description |
|---|---|---|---|
| chat_id | Integer or String | Yes | Target chat id or `@username`. |
| message_id | Integer | Yes | Message to delete. |

Limitations (exact, from source):
- Only deletable if sent less than 48 hours ago.
- Service messages about supergroup/channel/forum-topic creation can't be deleted.
- A dice message in a private chat can only be deleted if sent more than 24 hours ago.
- Bots can delete their own outgoing messages in private chats, groups, and supergroups.
- Bots can delete incoming messages in private chats.
- Bots with `can_post_messages` can delete their own outgoing channel messages.
- A bot that's a group admin can delete any message there.
- A bot with `can_delete_messages` admin right in a supergroup/channel can delete any message there.
- A bot with `can_manage_direct_messages` admin right in a channel can delete any message in that channel's direct-messages chat.

### deleteMessages

Deletes multiple messages at once; unfound ones are skipped. Returns `True`.

| Parameter | Type | Required | Description |
|---|---|---|---|
| chat_id | Integer or String | Yes | Target chat id or `@username`. |
| message_ids | Array of Integer | Yes | 1-100 message ids to delete. Same per-message limitations as `deleteMessage`. |

## Content-type fields at a glance

`Message` carries at most one primary content payload per message (plus optional `caption`/`caption_entities` for media). Full field tables for each of these belong in the files-and-media reference, not here — this is just the map from `Message` field name to type anchor:

| Message field | Type anchor | One-line description |
|---|---|---|
| photo | [PhotoSize](https://core.telegram.org/bots/api#photosize) (array) | Available sizes of a sent photo. |
| animation | [Animation](https://core.telegram.org/bots/api#animation) | GIF or H.264/MPEG-4 AVC video without sound. |
| audio | [Audio](https://core.telegram.org/bots/api#audio) | An audio file, for music-player-style display. |
| document | [Document](https://core.telegram.org/bots/api#document) | A general file, not categorized as another media type. |
| video | [Video](https://core.telegram.org/bots/api#video) | A video file. |
| video_note | [VideoNote](https://core.telegram.org/bots/api#videonote) | A round "[video message](https://telegram.org/blog/video-messages-and-telescope)". |
| voice | [Voice](https://core.telegram.org/bots/api#voice) | A voice message (OGG Opus, typically). |
| contact | [Contact](https://core.telegram.org/bots/api#contact) | A shared phone contact. |
| location | [Location](https://core.telegram.org/bots/api#location) | A shared point location. |
| venue | [Venue](https://core.telegram.org/bots/api#venue) | A named venue (location + title/address). |
| poll | [Poll](https://core.telegram.org/bots/api#poll) | A native poll. |
| dice | [Dice](https://core.telegram.org/bots/api#dice) | An animated dice/emoji with a random rolled value. |
| paid_media | [PaidMediaInfo](https://core.telegram.org/bots/api#paidmediainfo) | Paid media (photo/video/preview) gated behind Stars. |
| live_photo | [LivePhoto](https://core.telegram.org/bots/api#livephoto) | A live photo (still + short motion clip). |
| sticker | [Sticker](https://core.telegram.org/bots/api#sticker) | A sticker. |
| story | [Story](https://core.telegram.org/bots/api#story) | A forwarded story. |
| checklist | [Checklist](https://core.telegram.org/bots/api#checklist) | A checklist with tasks. |

## Gotchas

- **UTF-16 offset counting.** `MessageEntity.offset`/`.length` are UTF-16 code units. Any character outside the Basic Multilingual Plane (most emoji, some CJK extensions, etc.) is a 2-unit surrogate pair. Slicing text with anything other than UTF-16-unit-aware indexing misaligns entities whenever such characters appear before the entity's start. JS/TS `String.slice()` is UTF-16-native and needs no adjustment — but this is specific to JS engines, not a general rule.
- **`parse_mode` and `entities` are mutually exclusive** on every send/edit method that takes both (`sendMessage`, `editMessageText`, caption variants, `ReplyParameters.quote*`). Pick one per field; don't send both.
- **MarkdownV2 escaping is stricter than legacy Markdown** and covers more punctuation (`_ * [ ] ( ) ~ \` > # + - = | { } . !` in the general case, plus separate escaping rules inside `pre`/`code` and inside link-target parens). Legacy `Markdown` only requires escaping `_ * \` [` and forbids escaping inside an entity at all (close and reopen instead).
- **Legacy `Markdown` can't nest entities** and has no underline/strikethrough/spoiler/blockquote/expandable_blockquote/custom_emoji/date_time support — use `MarkdownV2` or explicit `entities` for any of that.
- **`sendMessage.text` is capped at 1-4096 characters after entity parsing** (same limit noted for `editMessageText.text`); `editMessageCaption.caption` caps at 0-1024.
- **Edit methods need exactly one addressing mode**: `chat_id`+`message_id` (for a normal message) or `inline_message_id` (for an inline-mode message) — never mix, never omit both. Business messages the bot didn't originate, with no inline keyboard, can only be edited within 48 hours of being sent.
- **`deleteMessages` takes 1-100 ids** per call and silently skips any it can't find; it does not report which ones failed.
- **`mention` entities require you to slice and compare text yourself**; `text_mention` entities hand you a `user` object directly. A mention-detection check that only handles one of the two will miss real-world mentions of usernameless users or plain `@handle` text, respectively.
