import { describe, expect, test } from 'bun:test'
import { safeName, truncateQuoted, extractLinkEntities, formatForwardOrigin, formatPollAnswer, formatReactionChange } from './inbound-context'

describe('safeName', () => {
  test('strips delimiter chars that could break out of the <channel> tag', () => {
    expect(safeName('a<b>c[d]e;f\r\ng')).toBe('a_b_c_d_e_f__g')
  })

  test('passes undefined through', () => {
    expect(safeName(undefined)).toBeUndefined()
  })

  test('leaves ordinary text untouched', () => {
    expect(safeName('hello world')).toBe('hello world')
  })
})

describe('truncateQuoted', () => {
  test('leaves short text untouched', () => {
    expect(truncateQuoted('hello')).toBe('hello')
  })

  test('truncates long text with an ellipsis at the default max', () => {
    const long = 'x'.repeat(400)
    const result = truncateQuoted(long)
    expect(result.length).toBe(301)
    expect(result.endsWith('…')).toBe(true)
  })

  test('respects a custom max', () => {
    expect(truncateQuoted('hello world', 5)).toBe('hello…')
  })
})

describe('extractLinkEntities', () => {
  test('returns empty array when there are no entities', () => {
    expect(extractLinkEntities('hello', undefined)).toEqual([])
  })

  test('extracts a text_link entity with its URL', () => {
    const text = 'see the docs here'
    const entities = [{ type: 'text_link', offset: 4, length: 8, url: 'https://example.com/docs' } as any]
    expect(extractLinkEntities(text, entities)).toEqual([
      { text: 'the docs', url: 'https://example.com/docs' },
    ])
  })

  test('extracts a text_mention entity with the mentioned user', () => {
    const text = 'ask Alice about it'
    const entities = [
      { type: 'text_mention', offset: 4, length: 5, user: { id: 42, is_bot: false, first_name: 'Alice', username: 'alice_t' } } as any,
    ]
    expect(extractLinkEntities(text, entities)).toEqual([
      { text: 'Alice', user_id: '42', username: 'alice_t' },
    ])
  })

  test('omits username when the mentioned user has none', () => {
    const text = 'ask Alice about it'
    const entities = [
      { type: 'text_mention', offset: 4, length: 5, user: { id: 42, is_bot: false, first_name: 'Alice' } } as any,
    ]
    expect(extractLinkEntities(text, entities)).toEqual([{ text: 'Alice', user_id: '42' }])
  })

  test('ignores unrelated entity types like bold or mention', () => {
    const text = '@bob is bold'
    const entities = [
      { type: 'mention', offset: 0, length: 4 } as any,
      { type: 'bold', offset: 8, length: 4 } as any,
    ]
    expect(extractLinkEntities(text, entities)).toEqual([])
  })

  test('sanitizes delimiter characters inside the linked text and URL', () => {
    const text = 'click <here>'
    const entities = [{ type: 'text_link', offset: 6, length: 6, url: 'https://x.test/<a>' } as any]
    expect(extractLinkEntities(text, entities)).toEqual([
      { text: '_here_', url: 'https://x.test/_a_' },
    ])
  })
})

describe('formatForwardOrigin', () => {
  test('returns undefined when there is no origin', () => {
    expect(formatForwardOrigin(undefined)).toBeUndefined()
  })

  test('formats a known-user origin by username', () => {
    expect(
      formatForwardOrigin({
        type: 'user',
        date: 0,
        sender_user: { id: 1, is_bot: false, first_name: 'Bob', username: 'bobby' },
      } as any),
    ).toBe('@bobby')
  })

  test('falls back to first_name when the user has no username', () => {
    expect(
      formatForwardOrigin({
        type: 'user',
        date: 0,
        sender_user: { id: 1, is_bot: false, first_name: 'Bob' },
      } as any),
    ).toBe('Bob')
  })

  test('formats a hidden-user origin', () => {
    expect(formatForwardOrigin({ type: 'hidden_user', date: 0, sender_user_name: 'Anonymous' } as any)).toBe(
      'Anonymous',
    )
  })

  test('formats a chat origin with an author signature', () => {
    expect(
      formatForwardOrigin({
        type: 'chat',
        date: 0,
        sender_chat: { id: 1, type: 'group', title: 'Book Club' },
        author_signature: 'Mod Team',
      } as any),
    ).toBe('Book Club (Mod Team)')
  })

  test('formats a channel origin without a signature', () => {
    expect(
      formatForwardOrigin({
        type: 'channel',
        date: 0,
        chat: { id: 1, type: 'channel', title: 'News Feed' },
        message_id: 5,
      } as any),
    ).toBe('News Feed')
  })
})

describe('formatPollAnswer', () => {
  test('reports a retracted vote when option_ids is empty', () => {
    expect(formatPollAnswer([], ['Yes', 'No'])).toBe('retracted their vote')
  })

  test('reports a single chosen option', () => {
    expect(formatPollAnswer([1], ['Yes', 'No'])).toBe('voted for: No')
  })

  test('reports multiple chosen options joined for a multi-answer poll', () => {
    expect(formatPollAnswer([0, 2], ['Red', 'Green', 'Blue'])).toBe('voted for: Red, Blue')
  })

  test('sanitizes delimiter characters in option text', () => {
    expect(formatPollAnswer([0], ['<script>'])).toBe('voted for: _script_')
  })
})

describe('formatReactionChange', () => {
  const emoji = (e: string) => [{ type: 'emoji', emoji: e } as any]

  test('reports a fresh reaction when there was none before', () => {
    expect(formatReactionChange([], emoji('👍'))).toBe('reacted 👍')
  })

  test('reports a removed reaction when the new set is empty', () => {
    expect(formatReactionChange(emoji('👍'), [])).toBe('removed their 👍 reaction')
  })

  test('reports a swap from one emoji to another', () => {
    expect(formatReactionChange(emoji('👍'), emoji('❤'))).toBe('changed their reaction from 👍 to ❤')
  })

  test('treats an identical old/new set as just reacted (no-op edge case)', () => {
    expect(formatReactionChange(emoji('🔥'), emoji('🔥'))).toBe('reacted 🔥')
  })

  test('handles both sets empty without throwing', () => {
    expect(formatReactionChange([], [])).toBe('reaction cleared')
  })

  test('joins multiple simultaneous reactions', () => {
    expect(formatReactionChange([], [...emoji('👍'), ...emoji('❤')])).toBe('reacted 👍, ❤')
  })

  test('labels a paid reaction with a star', () => {
    expect(formatReactionChange([], [{ type: 'paid' } as any])).toBe('reacted ⭐')
  })

  test('labels a custom emoji reaction generically', () => {
    expect(formatReactionChange([], [{ type: 'custom_emoji', custom_emoji_id: 'abc' } as any])).toBe(
      'reacted a custom emoji',
    )
  })
})
