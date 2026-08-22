import { describe, expect, test } from 'bun:test'
import { formatPermissionInput, truncateForTelegram, PERMISSION_MESSAGE_MAX_CHARS } from './permission-request'

describe('formatPermissionInput', () => {
  test('pretty-prints valid JSON', () => {
    expect(formatPermissionInput('{"command":"ls -la"}')).toBe('{\n  "command": "ls -la"\n}')
  })

  test('passes non-JSON text through verbatim', () => {
    expect(formatPermissionInput('not json')).toBe('not json')
  })
})

describe('truncateForTelegram', () => {
  test('leaves short text untouched and reports no truncation', () => {
    const result = truncateForTelegram('hello', 100, '…')
    expect(result).toEqual({ text: 'hello', truncated: false })
  })

  test('truncates text over the limit and appends the suffix', () => {
    const long = 'x'.repeat(50)
    const result = truncateForTelegram(long, 10, '…more')
    expect(result.truncated).toBe(true)
    expect(result.text).toBe('xxxxxxxxxx…more')
  })

  test('text exactly at the limit is not truncated', () => {
    const exact = 'x'.repeat(10)
    expect(truncateForTelegram(exact, 10, '…').truncated).toBe(false)
  })

  test('PERMISSION_MESSAGE_MAX_CHARS stays under Telegram\'s 4096 plain-text cap', () => {
    expect(PERMISSION_MESSAGE_MAX_CHARS).toBeLessThan(4096)
  })
})
