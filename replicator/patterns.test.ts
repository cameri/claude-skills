import { describe, expect, test } from 'bun:test'
import { emptyLedger, registerGene, recordInvocation, applyEvent, setCore, markSeasonal } from './ledger'
import { classifyGene, pruneCandidates, weeksIdle, isFlapping, isRevived, hasSeasonalGapPattern } from './patterns'

const BORN = '2026-01-01T03:00:00Z'
const BORN_DATE = '2026-01-01'

describe('weeksIdle', () => {
  test('counts from born when never invoked', () => {
    const l = registerGene(emptyLedger(), 'a:a', 'inward', BORN, BORN_DATE)
    expect(weeksIdle(l.genes['a:a'], '2026-01-15')).toBe(2)
  })

  test('counts from the most recent invocation', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'inward', BORN, BORN_DATE)
    l = recordInvocation(l, 'a:a', '2026-01-10', 1)
    expect(weeksIdle(l.genes['a:a'], '2026-01-24')).toBe(2)
  })
})

describe('isFlapping', () => {
  test('true when the last 4 toggles strictly alternate', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'inward', BORN, BORN_DATE)
    l = applyEvent(l, 'a:a', '2026-02-01T00:00:00Z', 'muted', 'decay')
    l = applyEvent(l, 'a:a', '2026-03-01T00:00:00Z', 'unmuted', 'need returned')
    l = applyEvent(l, 'a:a', '2026-04-01T00:00:00Z', 'muted', 'decay')
    l = applyEvent(l, 'a:a', '2026-05-01T00:00:00Z', 'unmuted', 'need returned')
    expect(isFlapping(l.genes['a:a'])).toBe(true)
  })

  test('false with fewer than 4 toggles', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'inward', BORN, BORN_DATE)
    l = applyEvent(l, 'a:a', '2026-02-01T00:00:00Z', 'muted', 'decay')
    expect(isFlapping(l.genes['a:a'])).toBe(false)
  })

  test('false when two consecutive toggles repeat the same type', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'inward', BORN, BORN_DATE)
    l = applyEvent(l, 'a:a', '2026-02-01T00:00:00Z', 'muted', 'decay')
    l = applyEvent(l, 'a:a', '2026-03-01T00:00:00Z', 'unmuted', 'x')
    l = applyEvent(l, 'a:a', '2026-04-01T00:00:00Z', 'unmuted', 'x')
    l = applyEvent(l, 'a:a', '2026-05-01T00:00:00Z', 'muted', 'decay')
    expect(isFlapping(l.genes['a:a'])).toBe(false)
  })
})

describe('hasSeasonalGapPattern', () => {
  test('true when two invocation dates are separated by >= threshold weeks', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'inward', BORN, BORN_DATE)
    l = recordInvocation(l, 'a:a', '2026-01-05', 1)
    l = recordInvocation(l, 'a:a', '2026-04-05', 1) // ~13 weeks later
    expect(hasSeasonalGapPattern(l.genes['a:a'], 8)).toBe(true)
  })

  test('false with only one invocation date', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'inward', BORN, BORN_DATE)
    l = recordInvocation(l, 'a:a', '2026-01-05', 1)
    expect(hasSeasonalGapPattern(l.genes['a:a'], 8)).toBe(false)
  })
})

describe('isRevived', () => {
  test('true when invoked long after the last mute', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'inward', BORN, BORN_DATE)
    l = applyEvent(l, 'a:a', '2026-02-01T00:00:00Z', 'muted', 'decay')
    l = recordInvocation(l, 'a:a', '2026-05-01', 1) // ~13 weeks after the mute
    expect(isRevived(l.genes['a:a'], 8)).toBe(true)
  })

  test('false when never muted', () => {
    const l = registerGene(emptyLedger(), 'a:a', 'inward', BORN, BORN_DATE)
    expect(isRevived(l.genes['a:a'], 8)).toBe(false)
  })
})

describe('classifyGene', () => {
  test('stable when invoked within the threshold', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'inward', BORN, BORN_DATE)
    l = recordInvocation(l, 'a:a', '2026-02-01', 1)
    expect(classifyGene(l.genes['a:a'], '2026-02-08')).toBe('stable')
  })

  test('decaying when idle past the threshold with no gap history', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'inward', BORN, BORN_DATE)
    l = recordInvocation(l, 'a:a', '2026-01-05', 1)
    expect(classifyGene(l.genes['a:a'], '2026-04-01')).toBe('decaying')
  })

  test('seasonal-candidate when idle but a prior burst-gap exists', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'inward', BORN, BORN_DATE)
    l = recordInvocation(l, 'a:a', '2026-01-05', 1)
    l = recordInvocation(l, 'a:a', '2026-01-06', 1) // burst
    l = recordInvocation(l, 'a:a', '2026-04-06', 1) // gap >= 8wk, still idle since
    expect(classifyGene(l.genes['a:a'], '2026-07-01')).toBe('seasonal-candidate')
  })

  test('flapping takes priority over decaying', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'inward', BORN, BORN_DATE)
    l = applyEvent(l, 'a:a', '2026-02-01T00:00:00Z', 'muted', 'decay')
    l = applyEvent(l, 'a:a', '2026-03-01T00:00:00Z', 'unmuted', 'x')
    l = applyEvent(l, 'a:a', '2026-04-01T00:00:00Z', 'muted', 'decay')
    l = applyEvent(l, 'a:a', '2026-05-01T00:00:00Z', 'unmuted', 'x')
    expect(classifyGene(l.genes['a:a'], '2026-08-01')).toBe('flapping')
  })
})

describe('pruneCandidates', () => {
  test('excludes core and seasonal genes, mutes decaying ones, flags 3rd decay for removal', () => {
    let l = emptyLedger()
    l = registerGene(l, 'core:x', 'preexisting', BORN, BORN_DATE, { core: true })
    l = recordInvocation(l, 'core:x', '2026-01-05', 1)

    l = registerGene(l, 'seasonal:x', 'preexisting', BORN, BORN_DATE)
    l = markSeasonal(l, 'seasonal:x')
    l = recordInvocation(l, 'seasonal:x', '2026-01-05', 1)

    l = registerGene(l, 'stale:x', 'preexisting', BORN, BORN_DATE)
    l = recordInvocation(l, 'stale:x', '2026-01-05', 1)
    l = applyEvent(l, 'stale:x', '2026-02-01T00:00:00Z', 'muted', 'decay')
    l = applyEvent(l, 'stale:x', '2026-03-01T00:00:00Z', 'muted', 'decay')
    l = applyEvent(l, 'stale:x', '2026-03-02T00:00:00Z', 'unmuted', 'test setup')

    const result = pruneCandidates(l, '2026-06-01')
    expect(result.toMute).toEqual(['stale:x'])
    expect(result.removalCandidates).toEqual(['stale:x'])
  })

  test('empty ledger produces empty results', () => {
    expect(pruneCandidates(emptyLedger(), '2026-06-01')).toEqual({ toMute: [], flagSeasonal: [], removalCandidates: [] })
  })
})
