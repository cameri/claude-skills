import { describe, expect, test } from 'bun:test'
import { selectChangedGenes, buildPublishPlan } from './publish-cycle'
import { emptyLedger, registerGene, setCore, applyEvent } from './ledger'
import { GENE_RECORD_KIND } from './publisher'

describe('selectChangedGenes', () => {
  test('returns every gene when sinceISO is null (first-ever publish)', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = registerGene(l, 'b:b', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    expect(selectChangedGenes(l, null).sort()).toEqual(['a:a', 'b:b'])
  })

  test('returns only genes with an event newer than sinceISO', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = registerGene(l, 'b:b', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = applyEvent(l, 'b:b', '2026-08-20T03:00:00Z', 'muted', 'decay')
    expect(selectChangedGenes(l, '2026-08-15')).toEqual(['b:b'])
  })

  test('returns nothing when no gene has changed since sinceISO', () => {
    const l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    expect(selectChangedGenes(l, '2026-08-15')).toEqual([])
  })

  test('excludes an event that fired on the same calendar date as sinceISO (date-only vs full-ISO comparison)', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = applyEvent(l, 'a:a', '2026-08-15T23:59:00Z', 'muted', 'decay')
    expect(selectChangedGenes(l, '2026-08-15')).toEqual([])
  })
})

describe('buildPublishPlan', () => {
  test('assembles exactly changed genes + 2 lists + 1 profile, in that order', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = registerGene(l, 'b:b', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = registerGene(l, 'c:c', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = { ...l, cycles: { ...l.cycles, lastPublish: '2026-08-15' } }
    l = applyEvent(l, 'b:b', '2026-08-20T03:00:00Z', 'muted', 'decay')

    const plan = buildPublishPlan(l, 'Replicator deus', 'a'.repeat(64))

    expect(plan).toHaveLength(4)
    expect(plan[0].label).toBe('b:b')
    expect(plan[0].kind).toBe(GENE_RECORD_KIND)
    expect(plan[1].label).toBe('core')
    expect(plan[2].label).toBe('active')
    expect(plan[3].label).toBe('profile')
  })

  test('no gene record content parses to an object carrying invocations/seasonal/core/muteThresholdWeeks', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = registerGene(l, 'b:b', 'inward', '2026-08-15T03:00:00Z', '2026-08-15')
    l = setCore(l, 'a:a')
    l = applyEvent(l, 'b:b', '2026-08-16T03:00:00Z', 'muted', 'decay')

    const plan = buildPublishPlan(l, 'Replicator deus', 'a'.repeat(64))
    const geneRecords = plan.filter(r => r.kind === GENE_RECORD_KIND)
    expect(geneRecords.length).toBeGreaterThan(0)

    for (const record of geneRecords) {
      const content = JSON.parse(record.content) as Record<string, unknown>
      expect(content).not.toHaveProperty('invocations')
      expect(content).not.toHaveProperty('seasonal')
      expect(content).not.toHaveProperty('core')
      expect(content).not.toHaveProperty('muteThresholdWeeks')
    }
  })
})
