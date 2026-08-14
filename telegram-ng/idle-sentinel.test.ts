import { describe, expect, test } from 'bun:test'
import { shouldPromptIdle, nextIdleAction } from './idle-sentinel'

describe('shouldPromptIdle', () => {
  test('exactly-at-threshold boundary triggers a prompt', () => {
    const result = shouldPromptIdle({
      lastActivityMs: 1000,
      nowMs: 1000 + 45 * 60 * 1000,
      idleThresholdMs: 45 * 60 * 1000,
      idleSafe: true,
      alreadyPromptedAtMs: null,
    })
    expect(result).toBe(true)
  })

  test('below threshold does not trigger', () => {
    const result = shouldPromptIdle({
      lastActivityMs: 1000,
      nowMs: 1000 + 45 * 60 * 1000 - 1,
      idleThresholdMs: 45 * 60 * 1000,
      idleSafe: true,
      alreadyPromptedAtMs: null,
    })
    expect(result).toBe(false)
  })

  test('idleSafe false suppresses even past threshold', () => {
    const result = shouldPromptIdle({
      lastActivityMs: 1000,
      nowMs: 1000 + 60 * 60 * 1000,
      idleThresholdMs: 45 * 60 * 1000,
      idleSafe: false,
      alreadyPromptedAtMs: null,
    })
    expect(result).toBe(false)
  })

  test('already-prompted-after-last-activity suppresses re-prompt', () => {
    const result = shouldPromptIdle({
      lastActivityMs: 1000,
      nowMs: 1000 + 60 * 60 * 1000,
      idleThresholdMs: 45 * 60 * 1000,
      idleSafe: true,
      alreadyPromptedAtMs: 2000, // prompted after last activity at 1000
    })
    expect(result).toBe(false)
  })

  test('already-prompted-before-last-activity (fresh activity since) allows re-prompt', () => {
    const result = shouldPromptIdle({
      lastActivityMs: 5000,
      nowMs: 5000 + 60 * 60 * 1000,
      idleThresholdMs: 45 * 60 * 1000,
      idleSafe: true,
      alreadyPromptedAtMs: 2000, // prompted before the latest activity at 5000
    })
    expect(result).toBe(true)
  })
})

describe('nextIdleAction', () => {
  test('below cap returns compact', () => {
    expect(nextIdleAction(0, 1)).toBe('compact')
  })

  test('at cap returns clear', () => {
    expect(nextIdleAction(1, 1)).toBe('clear')
  })

  test('above cap returns clear', () => {
    expect(nextIdleAction(2, 1)).toBe('clear')
  })

  test('cap=0 always returns clear', () => {
    expect(nextIdleAction(0, 0)).toBe('clear')
  })
})
