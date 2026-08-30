import { describe, expect, test } from 'bun:test'
import { formatUsageMessage } from './usage-cache'

const NOW = 1_800_000_000 // arbitrary fixed epoch seconds

describe('formatUsageMessage', () => {
  test('reports no data when the cache has never been written', () => {
    expect(formatUsageMessage(null, NOW)).toContain('No usage data cached yet')
  })

  test('formats context percentage and token counts', () => {
    const msg = formatUsageMessage(
      {
        cached_at: NOW,
        context_window: { used_percentage: 42.3, total_input_tokens: 84_600, context_window_size: 200_000 },
      },
      NOW,
    )
    expect(msg).toContain('Context: 42% used (~85k/200k tokens)')
  })

  test('flags a past resets_at as stale instead of "in 0m"', () => {
    const resetsAt = NOW - 3600 * 2 // 2h in the past — stale bucket
    const msg = formatUsageMessage(
      { cached_at: NOW, rate_limits: { seven_day: { used_percentage: 20, resets_at: resetsAt } } },
      NOW,
    )
    expect(msg).toContain('Weekly limit: 20% used')
    expect(msg).toContain('(stale)')
    expect(msg).not.toContain('in 0m')
  })

  test('omits a bucket entirely when its percentage is null/missing', () => {
    const msg = formatUsageMessage(
      { cached_at: NOW, rate_limits: { five_hour: { used_percentage: null }, seven_day: { used_percentage: 10 } } },
      NOW,
    )
    expect(msg).not.toContain('5-hour limit')
    expect(msg).toContain('Weekly limit: 10% used')
  })

  test('flags a stale cache but still shows the numbers, not silence', () => {
    const staleCachedAt = NOW - 7200 // 2 hours old, default max is 1 hour
    const msg = formatUsageMessage(
      { cached_at: staleCachedAt, context_window: { used_percentage: 30 } },
      NOW,
    )
    expect(msg).toContain('may be stale')
    expect(msg).toContain('Context: 30% used')
  })

  test('does not flag staleness for a fresh cache', () => {
    const msg = formatUsageMessage({ cached_at: NOW - 60, context_window: { used_percentage: 5 } }, NOW)
    expect(msg).not.toContain('stale')
  })

  test('token count omitted when total tokens is missing, percentage still shown', () => {
    const msg = formatUsageMessage({ cached_at: NOW, context_window: { used_percentage: 12 } }, NOW)
    expect(msg).toContain('Context: 12% used')
    expect(msg).not.toContain('tokens)')
  })
})
