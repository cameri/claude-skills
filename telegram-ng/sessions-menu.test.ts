import { describe, expect, test } from 'bun:test'
import { pickRecentSessions, buildSessionsKeyboard } from './sessions-menu'

const NOW = 1_000_000_000_000 // arbitrary fixed "now" in ms

describe('pickRecentSessions', () => {
  test('empty list returns empty array', () => {
    expect(pickRecentSessions([], 10, NOW)).toEqual([])
  })

  test('fewer entries than limit returns all of them, sorted by mtimeMs descending', () => {
    const entries = [
      { id: 'aaaaaaaa-0000-0000-0000-000000000000', mtimeMs: NOW - 1000, name: 'older' },
      { id: 'bbbbbbbb-0000-0000-0000-000000000000', mtimeMs: NOW - 500, name: 'newer' },
    ]
    const result = pickRecentSessions(entries, 10, NOW)
    expect(result.length).toBe(2)
    expect(result[0].id).toBe('bbbbbbbb-0000-0000-0000-000000000000')
    expect(result[1].id).toBe('aaaaaaaa-0000-0000-0000-000000000000')
  })

  test('more entries than limit are truncated to limit, keeping the most recent', () => {
    const entries = Array.from({ length: 15 }, (_, i) => ({
      id: `id-${i}`,
      mtimeMs: NOW - i * 1000, // id-0 is most recent
    }))
    const result = pickRecentSessions(entries, 10, NOW)
    expect(result.length).toBe(10)
    expect(result[0].id).toBe('id-0')
    expect(result[9].id).toBe('id-9')
  })

  test('label fallback chain: name wins over snippet and id', () => {
    const entries = [
      { id: 'session-id-1', mtimeMs: NOW, name: 'My Session', firstMessageSnippet: 'hello there' },
    ]
    const result = pickRecentSessions(entries, 10, NOW)
    expect(result[0].displayLabel).toBe('My Session')
  })

  test('label fallback chain: snippet wins over id when name absent', () => {
    const entries = [
      { id: 'session-id-1', mtimeMs: NOW, firstMessageSnippet: 'hello there' },
    ]
    const result = pickRecentSessions(entries, 10, NOW)
    expect(result[0].displayLabel).toBe('hello there')
  })

  test('label fallback chain: first 8 chars of id when neither name nor snippet present', () => {
    const entries = [
      { id: 'abcdefgh-ijkl-mnop-qrst-uvwxyz012345', mtimeMs: NOW },
    ]
    const result = pickRecentSessions(entries, 10, NOW)
    expect(result[0].displayLabel).toBe('abcdefgh')
  })

  test('snippet truncation: exactly 40 chars is left untouched, no ellipsis', () => {
    const snippet = 'a'.repeat(40)
    const entries = [{ id: 'x', mtimeMs: NOW, firstMessageSnippet: snippet }]
    const result = pickRecentSessions(entries, 10, NOW)
    expect(result[0].displayLabel).toBe(snippet)
    expect(result[0].displayLabel.length).toBe(40)
  })

  test('snippet truncation: 41 chars truncates to 40 + ellipsis', () => {
    const snippet = 'a'.repeat(41)
    const entries = [{ id: 'x', mtimeMs: NOW, firstMessageSnippet: snippet }]
    const result = pickRecentSessions(entries, 10, NOW)
    expect(result[0].displayLabel).toBe('a'.repeat(40) + '…')
  })

  test('relativeTime: just now for <1 min', () => {
    const entries = [{ id: 'x', mtimeMs: NOW - 30_000 }]
    const result = pickRecentSessions(entries, 10, NOW)
    expect(result[0].relativeTime).toBe('just now')
  })

  test('relativeTime: Xm ago for <60 min', () => {
    const entries = [{ id: 'x', mtimeMs: NOW - 5 * 60_000 }]
    const result = pickRecentSessions(entries, 10, NOW)
    expect(result[0].relativeTime).toBe('5m ago')
  })

  test('relativeTime: Xh ago for <24h', () => {
    const entries = [{ id: 'x', mtimeMs: NOW - 3 * 60 * 60_000 }]
    const result = pickRecentSessions(entries, 10, NOW)
    expect(result[0].relativeTime).toBe('3h ago')
  })

  test('relativeTime: Xd ago for >=24h', () => {
    const entries = [{ id: 'x', mtimeMs: NOW - 2 * 24 * 60 * 60_000 }]
    const result = pickRecentSessions(entries, 10, NOW)
    expect(result[0].relativeTime).toBe('2d ago')
  })
})

describe('buildSessionsKeyboard', () => {
  test('one row per session, text is label · relativeTime, callback_data is sess:<id>', () => {
    const sessions = [
      { id: 'abcd1234-5678-90ab-cdef-1234567890ab', displayLabel: 'My Session', relativeTime: '5m ago' },
    ]
    const kb = buildSessionsKeyboard(sessions)
    expect(kb.length).toBe(1)
    expect(kb[0].length).toBe(1)
    expect(kb[0][0].text).toBe('My Session · 5m ago')
    expect(kb[0][0].callback_data).toBe('sess:abcd1234-5678-90ab-cdef-1234567890ab')
  })

  test('standard UUID callback_data stays under 64 bytes with no truncation', () => {
    const sessions = [
      { id: 'abcd1234-5678-90ab-cdef-1234567890ab', displayLabel: 'x', relativeTime: 'y' },
    ]
    const kb = buildSessionsKeyboard(sessions)
    const data = kb[0][0].callback_data
    expect(Buffer.byteLength(data, 'utf8')).toBeLessThanOrEqual(64)
    expect(data).toBe('sess:abcd1234-5678-90ab-cdef-1234567890ab')
  })

  test('oversized id is truncated so callback_data stays within 64 bytes', () => {
    const longId = 'x'.repeat(100)
    const sessions = [{ id: longId, displayLabel: 'x', relativeTime: 'y' }]
    const kb = buildSessionsKeyboard(sessions)
    const data = kb[0][0].callback_data
    expect(Buffer.byteLength(data, 'utf8')).toBeLessThanOrEqual(64)
    expect(data.startsWith('sess:')).toBe(true)
  })

  test('multiple sessions produce multiple rows in order', () => {
    const sessions = [
      { id: 'id1', displayLabel: 'A', relativeTime: '1m ago' },
      { id: 'id2', displayLabel: 'B', relativeTime: '2m ago' },
    ]
    const kb = buildSessionsKeyboard(sessions)
    expect(kb.length).toBe(2)
    expect(kb[0][0].callback_data).toBe('sess:id1')
    expect(kb[1][0].callback_data).toBe('sess:id2')
  })
})
