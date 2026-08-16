import { describe, expect, test } from 'bun:test'
import { pickRecentSessions, buildSessionsMenuRows, truncatePayload, SESSION_PAYLOAD_MAX_BYTES } from './sessions-menu'

const NOW = 1_000_000_000_000 // arbitrary fixed "now" in ms

describe('pickRecentSessions', () => {
  test('empty list returns empty array', () => {
    expect(pickRecentSessions([], 10, NOW, null)).toEqual([])
  })

  test('fewer entries than limit returns all of them, sorted by mtimeMs descending', () => {
    const entries = [
      { id: 'aaaaaaaa-0000-0000-0000-000000000000', mtimeMs: NOW - 1000, name: 'older' },
      { id: 'bbbbbbbb-0000-0000-0000-000000000000', mtimeMs: NOW - 500, name: 'newer' },
    ]
    const result = pickRecentSessions(entries, 10, NOW, null)
    expect(result.length).toBe(2)
    expect(result[0].id).toBe('bbbbbbbb-0000-0000-0000-000000000000')
    expect(result[1].id).toBe('aaaaaaaa-0000-0000-0000-000000000000')
  })

  test('more entries than limit are truncated to limit, keeping the most recent', () => {
    const entries = Array.from({ length: 15 }, (_, i) => ({
      id: `id-${i}`,
      mtimeMs: NOW - i * 1000, // id-0 is most recent
    }))
    const result = pickRecentSessions(entries, 10, NOW, null)
    expect(result.length).toBe(10)
    expect(result[0].id).toBe('id-0')
    expect(result[9].id).toBe('id-9')
  })

  test('label fallback chain: name wins over snippet and id', () => {
    const entries = [
      { id: 'session-id-1', mtimeMs: NOW, name: 'My Session', firstMessageSnippet: 'hello there' },
    ]
    const result = pickRecentSessions(entries, 10, NOW, null)
    expect(result[0].displayLabel).toBe('My Session')
  })

  test('label fallback chain: snippet wins over id when name absent', () => {
    const entries = [
      { id: 'session-id-1', mtimeMs: NOW, firstMessageSnippet: 'hello there' },
    ]
    const result = pickRecentSessions(entries, 10, NOW, null)
    expect(result[0].displayLabel).toBe('hello there')
  })

  test('label fallback chain: first 8 chars of id when neither name nor snippet present', () => {
    const entries = [
      { id: 'abcdefgh-ijkl-mnop-qrst-uvwxyz012345', mtimeMs: NOW },
    ]
    const result = pickRecentSessions(entries, 10, NOW, null)
    expect(result[0].displayLabel).toBe('abcdefgh')
  })

  test('snippet truncation: exactly 40 chars is left untouched, no ellipsis', () => {
    const snippet = 'a'.repeat(40)
    const entries = [{ id: 'x', mtimeMs: NOW, firstMessageSnippet: snippet }]
    const result = pickRecentSessions(entries, 10, NOW, null)
    expect(result[0].displayLabel).toBe(snippet)
    expect(result[0].displayLabel.length).toBe(40)
  })

  test('snippet truncation: 41 chars truncates to 40 + ellipsis', () => {
    const snippet = 'a'.repeat(41)
    const entries = [{ id: 'x', mtimeMs: NOW, firstMessageSnippet: snippet }]
    const result = pickRecentSessions(entries, 10, NOW, null)
    expect(result[0].displayLabel).toBe('a'.repeat(40) + '…')
  })

  test('relativeTime: just now for <1 min', () => {
    const entries = [{ id: 'x', mtimeMs: NOW - 30_000 }]
    const result = pickRecentSessions(entries, 10, NOW, null)
    expect(result[0].relativeTime).toBe('just now')
  })

  test('relativeTime: Xm ago for <60 min', () => {
    const entries = [{ id: 'x', mtimeMs: NOW - 5 * 60_000 }]
    const result = pickRecentSessions(entries, 10, NOW, null)
    expect(result[0].relativeTime).toBe('5m ago')
  })

  test('relativeTime: Xh ago for <24h', () => {
    const entries = [{ id: 'x', mtimeMs: NOW - 3 * 60 * 60_000 }]
    const result = pickRecentSessions(entries, 10, NOW, null)
    expect(result[0].relativeTime).toBe('3h ago')
  })

  test('relativeTime: Xd ago for >=24h', () => {
    const entries = [{ id: 'x', mtimeMs: NOW - 2 * 24 * 60 * 60_000 }]
    const result = pickRecentSessions(entries, 10, NOW, null)
    expect(result[0].relativeTime).toBe('2d ago')
  })

  test('isCurrent: true for the entry matching currentSessionId, false for all others', () => {
    const entries = [
      { id: 'aaaaaaaa-0000-0000-0000-000000000000', mtimeMs: NOW - 1000 },
      { id: 'bbbbbbbb-0000-0000-0000-000000000000', mtimeMs: NOW - 500 },
      { id: 'cccccccc-0000-0000-0000-000000000000', mtimeMs: NOW },
    ]
    const result = pickRecentSessions(entries, 10, NOW, 'bbbbbbbb-0000-0000-0000-000000000000')
    const byId = Object.fromEntries(result.map(r => [r.id, r.isCurrent]))
    expect(byId['aaaaaaaa-0000-0000-0000-000000000000']).toBe(false)
    expect(byId['bbbbbbbb-0000-0000-0000-000000000000']).toBe(true)
    expect(byId['cccccccc-0000-0000-0000-000000000000']).toBe(false)
  })

  test('isCurrent: false for everyone when currentSessionId is null', () => {
    const entries = [
      { id: 'a', mtimeMs: NOW - 1000 },
      { id: 'b', mtimeMs: NOW },
    ]
    const result = pickRecentSessions(entries, 10, NOW, null)
    expect(result.every(r => r.isCurrent === false)).toBe(true)
  })

  test('isCurrent: false for everyone when currentSessionId is undefined', () => {
    const entries = [
      { id: 'a', mtimeMs: NOW - 1000 },
      { id: 'b', mtimeMs: NOW },
    ]
    const result = pickRecentSessions(entries, 10, NOW)
    expect(result.every(r => r.isCurrent === false)).toBe(true)
  })

  test('isCurrent: false for everyone when currentSessionId matches nothing in the list', () => {
    const entries = [
      { id: 'a', mtimeMs: NOW - 1000 },
      { id: 'b', mtimeMs: NOW },
    ]
    const result = pickRecentSessions(entries, 10, NOW, 'no-such-id')
    expect(result.every(r => r.isCurrent === false)).toBe(true)
  })
})

describe('buildSessionsMenuRows', () => {
  test('one row per session, text is label · relativeTime, payload is the raw id', () => {
    const sessions = [
      { id: 'abcd1234-5678-90ab-cdef-1234567890ab', displayLabel: 'My Session', relativeTime: '5m ago', isCurrent: false },
    ]
    const rows = buildSessionsMenuRows(sessions)
    expect(rows.length).toBe(2) // session row + Dismiss row
    expect(rows[0].length).toBe(1)
    expect(rows[0][0].text).toBe('My Session · 5m ago')
    expect(rows[0][0].payload).toBe('abcd1234-5678-90ab-cdef-1234567890ab')
  })

  test('standard UUID payload stays under the budget with no truncation', () => {
    const sessions = [
      { id: 'abcd1234-5678-90ab-cdef-1234567890ab', displayLabel: 'x', relativeTime: 'y', isCurrent: false },
    ]
    const rows = buildSessionsMenuRows(sessions)
    const payload = rows[0][0].payload
    expect(Buffer.byteLength(payload, 'utf8')).toBeLessThanOrEqual(SESSION_PAYLOAD_MAX_BYTES)
    expect(payload).toBe('abcd1234-5678-90ab-cdef-1234567890ab')
  })

  test('oversized id is truncated so the payload stays within the budget', () => {
    const longId = 'x'.repeat(100)
    const sessions = [{ id: longId, displayLabel: 'x', relativeTime: 'y', isCurrent: false }]
    const rows = buildSessionsMenuRows(sessions)
    const payload = rows[0][0].payload
    expect(Buffer.byteLength(payload, 'utf8')).toBeLessThanOrEqual(SESSION_PAYLOAD_MAX_BYTES)
    expect(longId.startsWith(payload)).toBe(true)
    expect(payload.length).toBeLessThan(longId.length)
  })

  test('multiple sessions produce multiple rows in order, plus a trailing Dismiss row', () => {
    const sessions = [
      { id: 'id1', displayLabel: 'A', relativeTime: '1m ago', isCurrent: false },
      { id: 'id2', displayLabel: 'B', relativeTime: '2m ago', isCurrent: false },
    ]
    const rows = buildSessionsMenuRows(sessions)
    expect(rows.length).toBe(3)
    expect(rows[0][0].payload).toBe('id1')
    expect(rows[1][0].payload).toBe('id2')
    expect(rows[2]).toEqual([{ text: 'Dismiss', payload: 'dismiss' }])
  })

  test('current session gets (current) suffix and a current payload', () => {
    const sessions = [
      { id: 'id1', displayLabel: 'A', relativeTime: '1m ago', isCurrent: false },
      { id: 'id2', displayLabel: 'B', relativeTime: '2m ago', isCurrent: true },
    ]
    const rows = buildSessionsMenuRows(sessions)
    expect(rows[0][0].text).toBe('A · 1m ago')
    expect(rows[0][0].payload).toBe('id1')
    expect(rows[1][0].text).toBe('B · 2m ago (current)')
    expect(rows[1][0].payload).toBe('current')
  })

  test('empty session list still produces just the Dismiss row', () => {
    const rows = buildSessionsMenuRows([])
    expect(rows).toEqual([[{ text: 'Dismiss', payload: 'dismiss' }]])
  })
})

describe('truncatePayload', () => {
  test('leaves ids at or under the budget untouched', () => {
    const id = 'a'.repeat(SESSION_PAYLOAD_MAX_BYTES)
    expect(truncatePayload(id)).toBe(id)
  })

  test('truncates ids over the budget down to exactly the budget, byte-for-byte', () => {
    const id = 'a'.repeat(SESSION_PAYLOAD_MAX_BYTES + 10)
    const truncated = truncatePayload(id)
    expect(Buffer.byteLength(truncated, 'utf8')).toBe(SESSION_PAYLOAD_MAX_BYTES)
    expect(id.startsWith(truncated)).toBe(true)
  })
})
