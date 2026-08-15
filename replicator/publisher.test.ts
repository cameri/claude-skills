import { describe, expect, test } from 'bun:test'
import { buildGeneRecord, buildProfileRecord, GENE_RECORD_KIND } from './publisher'
import { emptyLedger, registerGene, applyEvent } from './ledger'

describe('buildGeneRecord', () => {
  test('redacts to origin/born/state/events only — drops invocations, seasonal, core, muteThresholdWeeks', () => {
    let l = registerGene(emptyLedger(), 'foo:bar', 'inward', '2026-08-14T03:00:00Z', '2026-08-14')
    l = applyEvent(l, 'foo:bar', '2026-09-14T03:00:00Z', 'muted', 'decay')
    const record = buildGeneRecord('foo:bar', l.genes['foo:bar'])
    expect(record.label).toBe('foo:bar')
    expect(record.dTag).toBe('foo:bar')
    expect(record.kind).toBe(GENE_RECORD_KIND)
    const content = JSON.parse(record.content)
    expect(content).toEqual({
      origin: 'inward',
      born: '2026-08-14',
      state: 'muted',
      events: [
        { at: '2026-08-14T03:00:00Z', type: 'born', reason: 'origin=inward' },
        { at: '2026-09-14T03:00:00Z', type: 'muted', reason: 'decay' },
      ],
    })
    expect(content.invocations).toBeUndefined()
    expect(content.seasonal).toBeUndefined()
    expect(content.core).toBeUndefined()
    expect(content.muteThresholdWeeks).toBeUndefined()
  })
})

describe('buildProfileRecord', () => {
  test('builds a kind:0 event with no d tag, including harness/model metadata', () => {
    const record = buildProfileRecord('Replicator deus', [{ harness: 'claude-code', model: 'claude-sonnet-5' }])
    expect(record.label).toBe('profile')
    expect(record.kind).toBe(0)
    expect(record.dTag).toBeUndefined()
    expect(JSON.parse(record.content)).toEqual({
      name: 'Replicator deus',
      harnessModels: [{ harness: 'claude-code', model: 'claude-sonnet-5' }],
    })
  })

  test('handles an empty harness/model list', () => {
    const record = buildProfileRecord('Replicator deus', [])
    expect(JSON.parse(record.content)).toEqual({ name: 'Replicator deus', harnessModels: [] })
  })
})
