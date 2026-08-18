# Groups & privacy mode

Source: https://core.telegram.org/bots/api and https://core.telegram.org/bots/features, fetched 2026-08-18, Bot API version 10.2 (2026-07-14).

## Privacy mode

(Canonical source: https://core.telegram.org/bots/features#privacy-mode)

By default, **all bots** added to groups run in **Privacy Mode** and only see a subset of group messages:

**What a privacy-mode bot sees in a group (and only this):**

- Commands explicitly meant for it (e.g. `/command@this_bot`).
- General commands (e.g. `/start`) **only if the bot was the last bot to send a message to the group**.
- Inline messages sent [via](https://core.telegram.org/bots/api#inline-mode) the bot.
- Replies to any message implicitly or explicitly meant for this bot.

**What all bots always receive, regardless of privacy mode:**

- All service messages.
- All messages from private chats.
- All messages from channels where they are a member.

**Exception — bot admins:** privacy mode is enabled by default for all bots *except* bots that were added to a group as administrators. Admin bots always receive **all messages**, privacy mode or not.

**Toggling it:** privacy mode can be disabled (via @BotFather) so the bot receives all messages like an ordinary user. Telegram's own guidance: only do this when **absolutely necessary** — in most cases, using the force-reply option on the bot's own messages is enough to get implicit replies routed to it anyway. **The bot must be re-added to the group for a privacy-mode toggle to take effect** — flipping the setting on an already-added bot does nothing until it's kicked and re-invited.

**Visibility:** a bot's current privacy setting is visible to users in the group's member list — it isn't a hidden implementation detail.

For how `telegram-ng`'s `server.ts` decides whether a message counts as "directed at the bot" (mention entities + reply-to-bot, independent of privacy mode's own filtering), see the "Gotchas" section below.

### Ephemeral messages (related, group-scoped)

(Source: https://core.telegram.org/bots/features#ephemeral-messages)

Ephemeral messages let a bot send **private responses inside a group chat** — visible only to one specific user and the bot itself. Useful for welcome messages, whispers, personalized summaries, and contextual hints that shouldn't clutter the group for everyone else.

- Bots can [reply](https://core.telegram.org/bots/api#replyparameters) to ephemeral messages or [delete](https://core.telegram.org/bots/api#deleteephemeralmessage) them before they expire.
- Not limited to text — supports photos, videos, animations, audio, voice messages, stickers, documents, contacts, locations, and venues.
- **Two-way**: users can also send **ephemeral commands** to a bot. When a command is configured as ephemeral, the user's initial message is completely invisible to other group members and other bots — a discreet interaction in a public space.
- Telegram clients visually distinguish ephemeral bot [commands](https://core.telegram.org/bots/api#botcommand) in the UI.

`telegram-ng`'s `reply` tool exposes this as `receiver_user_id` in a group — see the MCP server instructions / `configure` skill; it only works when `bot_is_admin` was true on the inbound message meta.

## Chat types and relevant fields

`Chat` / `ChatFullInfo` (https://core.telegram.org/bots/api#chat, https://core.telegram.org/bots/api#chatfullinfo) represent any conversation a bot can be in. `type` is the load-bearing field for branching group-vs-not logic:

| `type` value | Meaning |
|---|---|
| `private` | 1:1 DM with a user |
| `group` | basic group (no topics, more limited API surface than supergroup) |
| `supergroup` | large group; only supergroups support topics, slow mode, permissions, invite links with join requests, etc. |
| `channel` | broadcast channel |

Fields relevant to group management (filtered from the full `ChatFullInfo` field table — business/gift/story/rating fields omitted as out of scope here):

| Field | Type | Notes |
|---|---|---|
| `title` | String | *Optional.* Supergroups, channels, and group chats |
| `username` | String | *Optional.* Public @username, if the chat has one |
| `is_forum` | True | *Optional.* True if the supergroup has [topics](https://telegram.org/blog/topics-in-groups-collectible-usernames#topics-in-groups) enabled |
| `active_usernames` | Array of String | *Optional.* All active usernames if the chat has [collectible usernames](https://telegram.org/blog/topics-in-groups-collectible-usernames#collectible-usernames) |
| `permissions` | [ChatPermissions](https://core.telegram.org/bots/api#chatpermissions) | *Optional.* Default member permissions for groups/supergroups — see table below |
| `slow_mode_delay` | Integer | *Optional.* Supergroups: minimum seconds between consecutive messages from an unprivileged member |
| `linked_chat_id` | Integer | *Optional.* Discussion-group id for a channel, or vice versa; supergroups/channels only |
| `join_to_send_messages` | True | *Optional.* True if users must join the supergroup before sending messages |
| `join_by_request` | True | *Optional.* True if users joining without an invite link need admin approval |
| `has_hidden_members` | True | *Optional.* True if non-admins can only see the bot/admin list, not the full member list |
| `has_protected_content` | True | *Optional.* True if messages from the chat can't be forwarded elsewhere |
| `sticker_set_name` | String | *Optional.* Supergroups: name of the group's sticker set |

`ChatFullInfo` is only returned by `getChat` — the lightweight `Chat` object (attached to messages/updates) does not carry most of the above; call `getChat` when you need `permissions`, `slow_mode_delay`, `linked_chat_id`, `join_to_send_messages`, `join_by_request`, `has_hidden_members`, `has_protected_content`, or `sticker_set_name`.

## `ChatMember` status model

https://core.telegram.org/bots/api#chatmember — an abstract union over exactly 6 concrete member types, discriminated by `status`.

### ChatMemberOwner (`status: "creator"`)

| Field | Type | Description |
|---|---|---|
| `status` | String | always `"creator"` |
| `user` | [User](https://core.telegram.org/bots/api#user) | the member |
| `is_anonymous` | Boolean | True if the user's presence in the chat is hidden |
| `custom_title` | String | *Optional.* Custom title for this user |

### ChatMemberAdministrator (`status: "administrator"`)

| Field | Type | Description |
|---|---|---|
| `status` | String | always `"administrator"` |
| `user` | User | the member |
| `can_be_edited` | Boolean | True if the bot itself is allowed to edit this admin's privileges |
| `is_anonymous` | Boolean | presence hidden |
| `can_manage_chat` | Boolean | event log, boost list, hidden-member visibility, spam reports, ignore slow mode, send without paying Stars — implied by any other admin privilege |
| `can_delete_messages` | Boolean | delete other users' messages |
| `can_manage_video_chats` | Boolean | manage video chats |
| `can_restrict_members` | Boolean | restrict/ban/unban members, or access supergroup statistics |
| `can_promote_members` | Boolean | add admins with a subset of own privileges, or demote admins they promoted |
| `can_change_info` | Boolean | change title/photo/settings |
| `can_invite_users` | Boolean | invite new users |
| `can_post_stories` | Boolean | post stories |
| `can_edit_stories` | Boolean | edit others' stories, pin chat stories, access story archive |
| `can_delete_stories` | Boolean | delete others' stories |
| `can_post_messages` | Boolean | *Optional.* channels only |
| `can_edit_messages` | Boolean | *Optional.* channels only |
| `can_pin_messages` | Boolean | *Optional.* groups/supergroups only |
| `can_manage_topics` | Boolean | *Optional.* supergroups only — create/rename/close/reopen forum topics |
| `can_manage_direct_messages` | Boolean | *Optional.* channels only |
| `can_manage_tags` | Boolean | *Optional.* groups/supergroups only; edit tags of regular members. Defaults to `can_pin_messages` if omitted |
| `custom_title` | String | *Optional.* |

### ChatMemberMember (`status: "member"`)

| Field | Type | Description |
|---|---|---|
| `status` | String | always `"member"` |
| `tag` | String | *Optional.* member's tag |
| `user` | User | the member |
| `until_date` | Integer | *Optional.* Unix time when the user's subscription expires (channel star subscriptions) |

### ChatMemberRestricted (`status: "restricted"`, supergroups only)

| Field | Type | Description |
|---|---|---|
| `status` | String | always `"restricted"` |
| `tag` | String | *Optional.* |
| `user` | User | the member |
| `is_member` | Boolean | True if currently a member |
| `can_send_messages` | Boolean | text, rich messages, contacts, giveaways, invoices, locations, venues |
| `can_send_audios` / `can_send_documents` / `can_send_photos` / `can_send_videos` / `can_send_video_notes` / `can_send_voice_notes` | Boolean | per-media-type send permission |
| `can_send_polls` | Boolean | polls and checklists |
| `can_send_other_messages` | Boolean | animations, games, stickers, inline bots |
| `can_add_web_page_previews` | Boolean | link previews |
| `can_react_to_messages` | Boolean | react to messages |
| `can_edit_tag` | Boolean | edit own tag |
| `can_change_info` | Boolean | change title/photo/settings |
| `can_invite_users` | Boolean | invite new users |
| `can_pin_messages` | Boolean | pin messages |
| `can_manage_topics` | Boolean | create forum topics |
| `until_date` | Integer | Unix time restrictions lift; `0` = forever |

### ChatMemberLeft (`status: "left"`)

| Field | Type | Description |
|---|---|---|
| `status` | String | always `"left"` |
| `user` | User | the member |

### ChatMemberBanned (`status: "kicked"`)

| Field | Type | Description |
|---|---|---|
| `status` | String | always `"kicked"` |
| `user` | User | the member |
| `until_date` | Integer | Unix time restrictions lift; `0` = banned forever |

### ChatAdministratorRights

https://core.telegram.org/bots/api#chatadministratorrights — same right set as `ChatMemberAdministrator` minus `user`/`can_be_edited`/`custom_title`. Used when requesting or declaring the rights a bot wants as a group/channel admin (e.g. via `myDefaultAdministratorRights` in @BotFather, or `getMyDefaultAdministratorRights`/`setMyDefaultAdministratorRights`). Field meanings are identical to the `ChatMemberAdministrator` table above.

### ChatPermissions

https://core.telegram.org/bots/api#chatpermissions — describes what a **non-administrator** member may do. This is the payload `restrictChatMember` and `setChatPermissions` take.

| Field | Description |
|---|---|
| `can_send_messages` | text, rich messages, contacts, giveaways, invoices, locations, venues |
| `can_send_audios` / `can_send_documents` / `can_send_photos` / `can_send_videos` / `can_send_video_notes` / `can_send_voice_notes` | per-media-type |
| `can_send_polls` | polls and checklists |
| `can_send_other_messages` | animations, games, stickers, inline bots |
| `can_add_web_page_previews` | link previews |
| `can_react_to_messages` | react to messages. Defaults to `can_send_messages` if omitted |
| `can_edit_tag` | edit own tag. Defaults to `can_pin_messages` if omitted |
| `can_change_info` | change title/photo/settings. **Ignored in public supergroups** |
| `can_invite_users` | invite new users |
| `can_pin_messages` | pin messages. **Ignored in public supergroups** |
| `can_manage_topics` | create forum topics. Defaults to `can_pin_messages` if omitted |

All fields are individually optional booleans. See `use_independent_chat_permissions` below for how `can_send_other_messages`/`can_add_web_page_previews`/`can_send_polls` can implicitly grant other send permissions unless disabled.

### ChatMemberUpdated

https://core.telegram.org/bots/api#chatmemberupdated — the payload of a `chat_member`/`my_chat_member` update.

| Field | Type | Description |
|---|---|---|
| `chat` | Chat | chat the member belongs to |
| `from` | User | who performed the action |
| `date` | Integer | Unix time of the change |
| `old_chat_member` | ChatMember | previous state |
| `new_chat_member` | ChatMember | new state |
| `invite_link` | [ChatInviteLink](https://core.telegram.org/bots/api#chatinvitelink) | *Optional.* link used to join, if joined via link |
| `via_join_request` | Boolean | *Optional.* True if joined via an approved direct join request (no invite link) |
| `via_chat_folder_invite_link` | Boolean | *Optional.* True if joined via a chat folder invite link |

### ChatJoinRequest

https://core.telegram.org/bots/api#chatjoinrequest — the payload of a `chat_join_request` update.

| Field | Type | Description |
|---|---|---|
| `chat` | Chat | chat the request targets |
| `from` | User | requester |
| `user_chat_id` | Integer | private-chat id with the requester; usable for 5 minutes to message them before the request is resolved |
| `date` | Integer | Unix time sent |
| `bio` | String | *Optional.* requester's bio |
| `invite_link` | ChatInviteLink | *Optional.* link used to request |
| `query_id` | String | *Optional.* present only for bots assigned to process join requests; must call `sendChatJoinRequestWebApp` or `answerChatJoinRequestQuery` within 10 seconds |

## Chat-member-management methods

All require the bot to be a chat member; most require the bot to be an **administrator with a specific right** (see the Gotchas section — calls fail with 403 otherwise).

### Moderation actions

| Method | Key parameters | Notes |
|---|---|---|
| [banChatMember](https://core.telegram.org/bots/api#banchatmember) | `chat_id`, `user_id`, `until_date?`, `revoke_messages?` | ban from group/supergroup/channel; `until_date` <30s or >366d from now = permanent; `revoke_messages` deletes their messages (always true for supergroups/channels) |
| [unbanChatMember](https://core.telegram.org/bots/api#unbanchatmember) | `chat_id`, `user_id`, `only_if_banned?` | user does **not** auto-rejoin; without `only_if_banned`, an existing member also gets removed by this call |
| [restrictChatMember](https://core.telegram.org/bots/api#restrictchatmember) | `chat_id`, `user_id`, `permissions` (ChatPermissions), `use_independent_chat_permissions?`, `until_date?` | supergroups only; pass all-`True` permissions to lift restrictions |
| [promoteChatMember](https://core.telegram.org/bots/api#promotechatmember) | `chat_id`, `user_id`, plus one boolean per `can_*` right (`is_anonymous`, `can_manage_chat`, `can_delete_messages`, `can_manage_video_chats`, `can_restrict_members`, `can_promote_members`, `can_change_info`, `can_invite_users`, `can_post_stories`, `can_edit_stories`, `can_delete_stories`, `can_post_messages`, `can_edit_messages`, `can_pin_messages`, `can_manage_topics`, `can_manage_direct_messages`, `can_manage_tags`) | pass all `False` to demote |
| [setChatAdministratorCustomTitle](https://core.telegram.org/bots/api#setchatadministratorcustomtitle) | `chat_id`, `user_id`, `custom_title` (0-16 chars, no emoji) | only for admins the bot itself promoted; supergroups only |
| [setChatMemberTag](https://core.telegram.org/bots/api#setchatmembertag) | `chat_id`, `user_id`, `tag?` (0-16 chars, no emoji) | requires `can_manage_tags` |
| [banChatSenderChat](https://core.telegram.org/bots/api#banchatsenderchat) | `chat_id`, `sender_chat_id` | bans a channel (posting as itself) from a supergroup/channel |
| [unbanChatSenderChat](https://core.telegram.org/bots/api#unbanchatsenderchat) | `chat_id`, `sender_chat_id` | |
| [setChatPermissions](https://core.telegram.org/bots/api#setchatpermissions) | `chat_id`, `permissions` (ChatPermissions), `use_independent_chat_permissions?` | sets the group/supergroup-wide default; requires `can_restrict_members` |

`use_independent_chat_permissions` (on both `restrictChatMember` and `setChatPermissions`): when **not** passed, `can_send_other_messages`/`can_add_web_page_previews` implicitly imply `can_send_messages`+all per-media `can_send_*` permissions, and `can_send_polls` implies `can_send_messages`. Pass `True` to turn off that implication and treat every permission independently.

### Invite links & join requests

| Method | Key parameters | Notes |
|---|---|---|
| [exportChatInviteLink](https://core.telegram.org/bots/api#exportchatinvitelink) | `chat_id` | (re)generates the chat's *primary* link, revoking the previous one; returns a `String`. Each admin has their own primary link — bots can't reuse another admin's |
| [createChatInviteLink](https://core.telegram.org/bots/api#createchatinvitelink) | `chat_id`, `name?`, `expire_date?`, `member_limit?` (1-99999), `creates_join_request?` | creates an *additional* link; returns `ChatInviteLink`. `creates_join_request` and `member_limit` are mutually exclusive |
| [editChatInviteLink](https://core.telegram.org/bots/api#editchatinvitelink) | `chat_id`, `invite_link`, `name?`, `expire_date?`, `member_limit?`, `creates_join_request?` | only for non-primary links the bot created |
| [revokeChatInviteLink](https://core.telegram.org/bots/api#revokechatinvitelink) | `chat_id`, `invite_link` | revoking the primary link auto-generates a new one |
| [approveChatJoinRequest](https://core.telegram.org/bots/api#approvechatjoinrequest) | `chat_id`, `user_id` | requires `can_invite_users` |
| [declineChatJoinRequest](https://core.telegram.org/bots/api#declinechatjoinrequest) | `chat_id`, `user_id` | requires `can_invite_users` |
| [answerChatJoinRequestQuery](https://core.telegram.org/bots/api#answerchatjoinrequestquery) | `chat_join_request_query_id`, `result` (`"approve"` / `"decline"` / `"queue"`) | resolves a `query_id`-bearing `ChatJoinRequest` (bot is assigned as the chat's join-request processor); must respond within 10s or call `sendChatJoinRequestWebApp` first |

(There's also a channel-only pair, `createChatSubscriptionInviteLink`/`editChatSubscriptionInviteLink`, for Telegram Stars paid subscriptions — out of scope for group moderation, see https://core.telegram.org/bots/api#createchatsubscriptioninvitelink.)

### Chat metadata

| Method | Key parameters | Notes |
|---|---|---|
| [setChatPhoto](https://core.telegram.org/bots/api#setchatphoto) | `chat_id`, `photo` (InputFile, multipart) | not for private chats |
| [deleteChatPhoto](https://core.telegram.org/bots/api#deletechatphoto) | `chat_id` | |
| [setChatTitle](https://core.telegram.org/bots/api#setchattitle) | `chat_id`, `title` (1-128 chars) | not for private chats |
| [setChatDescription](https://core.telegram.org/bots/api#setchatdescription) | `chat_id`, `description?` (0-255 chars) | groups, supergroups, channels |
| [leaveChat](https://core.telegram.org/bots/api#leavechat) | `chat_id` | group/supergroup/channel only, not direct-message chats |
| [getChat](https://core.telegram.org/bots/api#getchat) | `chat_id` | returns full `ChatFullInfo` |
| [getChatAdministrators](https://core.telegram.org/bots/api#getchatadministrators) | `chat_id`, `return_bots?` | returns `Array<ChatMember>`; other bots omitted unless `return_bots` |
| [getChatMemberCount](https://core.telegram.org/bots/api#getchatmembercount) | `chat_id` | returns `Integer` |
| [getChatMember](https://core.telegram.org/bots/api#getchatmember) | `chat_id`, `user_id` | returns one `ChatMember`; only guaranteed for other users if the bot is an admin |

### Pinning

| Method | Key parameters | Notes |
|---|---|---|
| [pinChatMessage](https://core.telegram.org/bots/api#pinchatmessage) | `chat_id`, `message_id`, `disable_notification?`, `business_connection_id?` | groups/channels need `can_pin_messages` (groups) or `can_edit_messages` (channels); notifications always off in channels/private chats |
| [unpinChatMessage](https://core.telegram.org/bots/api#unpinchatmessage) | `chat_id`, `message_id?`, `business_connection_id?` | omit `message_id` to unpin the most recently pinned message; required if `business_connection_id` set |
| [unpinAllChatMessages](https://core.telegram.org/bots/api#unpinallchatmessages) | `chat_id` | same right requirements as unpin |

## Gotchas for group bots

- **Privacy-mode toggle needs a re-invite.** Flipping privacy mode in @BotFather does nothing to a group the bot is already in — kick and re-add the bot for the new setting to take effect.
- **`getChatMember` vs `getChatAdministrators` vs `getChatMemberCount`:** use `getChatMember` to check one specific user's status/rights (only reliably works for *other* users if the bot itself is an admin); `getChatAdministrators` to enumerate all admins/owner (pass `return_bots: true` to also see other bots); `getChatMemberCount` when you just need a headcount and don't want to page through members.
- **Admin-right gating causes silent-looking 403s.** Almost every moderation/metadata method above requires the bot to *be* an administrator **and** hold the specific `can_*` right the method needs (e.g. `restrictChatMember`/`setChatPermissions` need `can_restrict_members`; invite-link and join-request methods need `can_invite_users`; pin/unpin need `can_pin_messages`; `setChatMemberTag` needs `can_manage_tags`). A plain "administrator" flag isn't sufficient — check the specific right before assuming a call will succeed, and expect a 403 Forbidden if it's missing.
- **`chat_member` updates need bot-admin status AND an `allowed_updates` opt-in.** Even when the bot is a group admin, it will not receive `chat_member` (or `my_chat_member`/`chat_join_request`) updates unless they're explicitly listed in `allowed_updates` for `getUpdates`/`setWebhook`. See `updates-and-polling.md` in this same reference set for how `telegram-ng` configures that.
- **Mentions are message entities, not chat-membership data.** How `@mentions`/`text_mention` entities are structured and parsed is documented in the sibling `messages-and-entities.md` reference, not here. `telegram-ng`'s `server.ts` `isMentioned` (around lines 324-338) treats a group message as directed at the bot if any of: a `mention` entity's text matches `@<botUsername>`, a `text_mention` entity's `user.username` matches the bot, or the message is a reply to a message sent by the bot — independent of, and in addition to, whatever privacy mode already filtered out server-side.
