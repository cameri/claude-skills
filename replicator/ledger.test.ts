import { describe, expect, test } from 'bun:test'
import {
  emptyLedger,
  registerGene,
  recordInvocation,
  applyEvent,
  markSeasonal,
  setCore,
  recordCycleRun,
  recordOutwardScan,
  setReportOnlyPruning,
  DEFAULT_MUTE_THRESHOLD_WEEKS,
} from './ledger'

describe('emptyLedger', () => {
  test('starts with no genes and report-only pruning on', () => {
    const l = emptyLedger()
    expect(l.genes).toEqual({})
    expect(l.cycles).toEqual({ lastRun: null, lastOutwardScan: null, count: 0, reportOnlyPruning: true })
  })
})

describe('registerGene', () => {
  test('creates a gene with a born event and default threshold', () => {
    const l = registerGene(emptyLedger(), 'replicator:meditate', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    const gene = l.genes['replicator:meditate']
    expect(gene.origin).toBe('preexisting')
    expect(gene.born).toBe('2026-08-14')
    expect(gene.state).toBe('active')
    expect(gene.seasonal).toBe(false)
    expect(gene.core).toBe(false)
    expect(gene.muteThresholdWeeks).toBe(DEFAULT_MUTE_THRESHOLD_WEEKS)
    expect(gene.events).toEqual([{ at: '2026-08-14T03:00:00Z', type: 'born', reason: 'origin=preexisting' }])
    expect(gene.invocations).toEqual({})
  })

  test('is idempotent — registering the same key twice does not reset it', () => {
    let l = registerGene(emptyLedger(), 'foo:bar', 'inward', '2026-08-14T03:00:00Z', '2026-08-14')
    l = recordInvocation(l, 'foo:bar', '2026-08-14', 3)
    l = registerGene(l, 'foo:bar', 'inward', '2026-08-15T03:00:00Z', '2026-08-15')
    expect(l.genes['foo:bar'].born).toBe('2026-08-14')
    expect(l.genes['foo:bar'].invocations).toEqual({ '2026-08-14': 3 })
    expect(l.genes['foo:bar'].events.length).toBe(1)
  })

  test('honors the core option', () => {
    const l = registerGene(emptyLedger(), 'cronjobs:cronjob', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14', { core: true })
    expect(l.genes['cronjobs:cronjob'].core).toBe(true)
  })

  test('does not mutate the input ledger', () => {
    const before = emptyLedger()
    const snapshot = JSON.stringify(before)
    registerGene(before, 'foo:bar', 'inward', '2026-08-14T03:00:00Z', '2026-08-14')
    expect(JSON.stringify(before)).toBe(snapshot)
  })

  test('born follows the explicit date string, not a UTC slice of atISO (M3 regression)', () => {
    // atISO's UTC calendar date has already rolled forward relative to the
    // caller's "today" — this is exactly the shape of bug that produced a
    // born date after the gene's own first recorded invocation: registerGene
    // used to derive born by slicing atISO itself instead of trusting the
    // date string the caller (ledger-cli.ts) already computed.
    const l = registerGene(emptyLedger(), 'foo:bar', 'preexisting', '2026-08-15T02:00:00Z', '2026-08-14')
    expect(l.genes['foo:bar'].born).toBe('2026-08-14')
  })

  test('registering and recording an invocation at the same date string never produces born > invocation date', () => {
    const dateStr = '2026-08-14'
    let l = registerGene(emptyLedger(), 'foo:bar', 'preexisting', '2026-08-15T02:00:00Z', dateStr)
    l = recordInvocation(l, 'foo:bar', dateStr, 1)
    expect(l.genes['foo:bar'].born <= dateStr).toBe(true)
    expect(l.genes['foo:bar'].born).toBe(dateStr)
  })
})

describe('recordInvocation', () => {
  test('sums counts on the same day', () => {
    let l = registerGene(emptyLedger(), 'foo:bar', 'inward', '2026-08-14T03:00:00Z', '2026-08-14')
    l = recordInvocation(l, 'foo:bar', '2026-08-14', 2)
    l = recordInvocation(l, 'foo:bar', '2026-08-14', 3)
    expect(l.genes['foo:bar'].invocations['2026-08-14']).toBe(5)
  })

  test('keeps separate days separate', () => {
    let l = registerGene(emptyLedger(), 'foo:bar', 'inward', '2026-08-14T03:00:00Z', '2026-08-14')
    l = recordInvocation(l, 'foo:bar', '2026-08-14', 2)
    l = recordInvocation(l, 'foo:bar', '2026-08-15', 1)
    expect(l.genes['foo:bar'].invocations).toEqual({ '2026-08-14': 2, '2026-08-15': 1 })
  })

  test('throws on an unknown gene', () => {
    expect(() => recordInvocation(emptyLedger(), 'nope:nope', '2026-08-14', 1)).toThrow('unknown gene: nope:nope')
  })
})

describe('applyEvent', () => {
  test('muted sets state to muted and appends the event', () => {
    let l = registerGene(emptyLedger(), 'foo:bar', 'inward', '2026-08-14T03:00:00Z', '2026-08-14')
    l = applyEvent(l, 'foo:bar', '2026-09-14T03:00:00Z', 'muted', 'decay')
    expect(l.genes['foo:bar'].state).toBe('muted')
    expect(l.genes['foo:bar'].events.at(-1)).toEqual({ at: '2026-09-14T03:00:00Z', type: 'muted', reason: 'decay' })
  })

  test('unmuted sets state back to active', () => {
    let l = registerGene(emptyLedger(), 'foo:bar', 'inward', '2026-08-14T03:00:00Z', '2026-08-14')
    l = applyEvent(l, 'foo:bar', '2026-09-14T03:00:00Z', 'muted', 'decay')
    l = applyEvent(l, 'foo:bar', '2026-10-01T03:00:00Z', 'unmuted', 'real need returned')
    expect(l.genes['foo:bar'].state).toBe('active')
  })

  test('removed-proposed does not change state', () => {
    let l = registerGene(emptyLedger(), 'foo:bar', 'inward', '2026-08-14T03:00:00Z', '2026-08-14')
    l = applyEvent(l, 'foo:bar', '2026-09-14T03:00:00Z', 'muted', 'decay')
    l = applyEvent(l, 'foo:bar', '2026-10-14T03:00:00Z', 'removed-proposed', '3rd decay cycle')
    expect(l.genes['foo:bar'].state).toBe('muted')
    expect(l.genes['foo:bar'].events.length).toBe(3)
  })

  test('throws on an unknown gene', () => {
    expect(() => applyEvent(emptyLedger(), 'nope:nope', '2026-08-14T03:00:00Z', 'muted', 'x')).toThrow('unknown gene: nope:nope')
  })
})

describe('markSeasonal / setCore', () => {
  test('set their respective flags without touching other fields', () => {
    let l = registerGene(emptyLedger(), 'foo:bar', 'inward', '2026-08-14T03:00:00Z', '2026-08-14')
    l = markSeasonal(l, 'foo:bar')
    l = setCore(l, 'foo:bar')
    expect(l.genes['foo:bar'].seasonal).toBe(true)
    expect(l.genes['foo:bar'].core).toBe(true)
    expect(l.genes['foo:bar'].state).toBe('active')
  })
})

describe('cycle bookkeeping', () => {
  test('recordCycleRun increments count and sets lastRun', () => {
    let l = recordCycleRun(emptyLedger(), '2026-08-14')
    l = recordCycleRun(l, '2026-08-15')
    expect(l.cycles.lastRun).toBe('2026-08-15')
    expect(l.cycles.count).toBe(2)
  })

  test('recordOutwardScan sets lastOutwardScan only', () => {
    const l = recordOutwardScan(emptyLedger(), '2026-08-14')
    expect(l.cycles.lastOutwardScan).toBe('2026-08-14')
    expect(l.cycles.count).toBe(0)
  })

  test('setReportOnlyPruning toggles the flag', () => {
    const l = setReportOnlyPruning(emptyLedger(), false)
    expect(l.cycles.reportOnlyPruning).toBe(false)
  })
})
