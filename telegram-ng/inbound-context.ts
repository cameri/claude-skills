/**
 * Pure helpers for enriching inbound Telegram messages with context that
 * `message.text` alone doesn't carry: quoted/forwarded provenance and
 * text_link/text_mention entities (whose target isn't visible in the text).
 *
 * Anything returned here lands inside the `<channel>` notification's meta,
 * which the host renders as XML tag attributes — safeName mirrors the
 * sanitization already applied to attachment names for the same reason.
 */
import type { MessageEntity, MessageOrigin, ReactionType } from 'grammy/types'

export function safeName(s: string | undefined): string | undefined {
  return s?.replace(/[<>\[\]\r\n;]/g, '_')
}

export function truncateQuoted(s: string, max = 300): string {
  return s.length > max ? s.slice(0, max) + '…' : s
}

export interface LinkEntity {
  text: string
  url?: string
  user_id?: string
  username?: string
}

// text_link entities carry a URL with no matching substring in the visible
// text; text_mention entities target a user with no @username in the text.
// Both are otherwise invisible to anyone reading message.text alone.
export function extractLinkEntities(
  text: string,
  entities: MessageEntity[] | undefined,
): LinkEntity[] {
  if (!entities?.length) return []
  const out: LinkEntity[] = []
  for (const e of entities) {
    const label = safeName(text.slice(e.offset, e.offset + e.length)) ?? ''
    if (e.type === 'text_link') {
      out.push({ text: label, url: safeName(e.url) })
    } else if (e.type === 'text_mention') {
      out.push({
        text: label,
        user_id: String(e.user.id),
        ...(e.user.username ? { username: safeName(e.user.username) } : {}),
      })
    }
  }
  return out
}

export function formatForwardOrigin(origin: MessageOrigin | undefined): string | undefined {
  if (!origin) return undefined
  switch (origin.type) {
    case 'user': {
      const u = origin.sender_user
      return safeName(u.username ? `@${u.username}` : u.first_name)
    }
    case 'hidden_user':
      return safeName(origin.sender_user_name)
    case 'chat': {
      const label = origin.sender_chat.title ?? origin.sender_chat.username ?? 'chat'
      return safeName(origin.author_signature ? `${label} (${origin.author_signature})` : label)
    }
    case 'channel': {
      const label = origin.chat.title ?? 'channel'
      return safeName(origin.author_signature ? `${label} (${origin.author_signature})` : label)
    }
  }
}

// Empty option_ids means the voter retracted their vote — Bot API represents
// both "voted" and "unvoted" as PollAnswer updates, distinguished only by
// whether option_ids is empty.
export function formatPollAnswer(optionIds: number[], options: string[]): string {
  if (optionIds.length === 0) return 'retracted their vote'
  const chosen = optionIds.map(i => safeName(options[i]) ?? `option ${i}`)
  return `voted for: ${chosen.join(', ')}`
}

function reactionLabel(r: ReactionType): string {
  if (r.type === 'emoji') return r.emoji
  if (r.type === 'paid') return '⭐'
  return 'a custom emoji'
}

// message_reaction updates carry the full old/new reaction sets rather than
// a single delta — a user can only have one reaction per message in a normal
// chat (multiple only when the chat allows it), but the sets are compared
// wholesale so an add, remove, or swap all read naturally either way.
export function formatReactionChange(oldReaction: ReactionType[], newReaction: ReactionType[]): string {
  const oldLabels = oldReaction.map(reactionLabel)
  const newLabels = newReaction.map(reactionLabel)
  if (newLabels.length === 0) {
    return oldLabels.length ? `removed their ${oldLabels.join(', ')} reaction` : 'reaction cleared'
  }
  if (oldLabels.length === 0 || oldLabels.join(',') === newLabels.join(',')) {
    return `reacted ${newLabels.join(', ')}`
  }
  return `changed their reaction from ${oldLabels.join(', ')} to ${newLabels.join(', ')}`
}
