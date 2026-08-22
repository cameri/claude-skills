import { describe, expect, test } from 'bun:test'
import { selectChangedGenes, buildPublishPlan, buildGistSnapshot, filterPublicGenes } from './publish-cycle'
import { emptyLedger, registerGene, setCore, applyEvent } from './ledger'
import { GENE_RECORD_KIND, LIST_RECORD_KIND } from './publisher'
import type { VisibilityMap } from './repo-visibility'

const ALL_PUBLIC: VisibilityMap = {
  a: { repo: 'n/a', public: true, checkedAt: '2026-08-15' },
  b: { repo: 'n/a', public: true, checkedAt: '2026-08-15' },
  c: { repo: 'n/a', public: true, checkedAt: '2026-08-15' },
}

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

describe('filterPublicGenes', () => {
  test('keeps only genes whose plugin prefix is confirmed public', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = registerGene(l, 'private-plugin:x', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    const filtered = filterPublicGenes(l, ALL_PUBLIC)
    expect(Object.keys(filtered.genes)).toEqual(['a:a'])
  })

  test('drops every gene when the visibility map is empty — fail closed', () => {
    const l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    expect(filterPublicGenes(l, {}).genes).toEqual({})
  })

  test('leaves cycles/harnessModels untouched', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = { ...l, cycles: { ...l.cycles, lastPublish: '2026-08-15' } }
    const filtered = filterPublicGenes(l, ALL_PUBLIC)
    expect(filtered.cycles).toEqual(l.cycles)
    expect(filtered.harnessModels).toEqual(l.harnessModels)
  })
})

describe('buildPublishPlan', () => {
  test('assembles exactly changed genes + 2 lists + 1 profile + 1 announcement, in that order', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = registerGene(l, 'b:b', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = registerGene(l, 'c:c', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = { ...l, cycles: { ...l.cycles, lastPublish: '2026-08-15' } }
    l = applyEvent(l, 'b:b', '2026-08-20T03:00:00Z', 'muted', 'decay')

    const plan = buildPublishPlan(l, 'Replicator deus', 'a'.repeat(64), ALL_PUBLIC)

    expect(plan).toHaveLength(5)
    expect(plan[0].label).toBe('b:b')
    expect(plan[0].kind).toBe(GENE_RECORD_KIND)
    expect(plan[1].label).toBe('core')
    expect(plan[2].label).toBe('active')
    expect(plan[3].label).toBe('profile')
    expect(plan[4].label).toBe('announcement')
    expect(plan[4].kind).toBe(1)
  })

  test('no announcement when nothing changed since lastPublish', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = { ...l, cycles: { ...l.cycles, lastPublish: '2026-08-15' } }
    const plan = buildPublishPlan(l, 'Replicator deus', 'a'.repeat(64), ALL_PUBLIC)
    expect(plan.some(r => r.label === 'announcement')).toBe(false)
  })

  test('no gene record content parses to an object carrying invocations/seasonal/core/muteThresholdWeeks', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = registerGene(l, 'b:b', 'inward', '2026-08-15T03:00:00Z', '2026-08-15')
    l = setCore(l, 'a:a')
    l = applyEvent(l, 'b:b', '2026-08-16T03:00:00Z', 'muted', 'decay')

    const plan = buildPublishPlan(l, 'Replicator deus', 'a'.repeat(64), ALL_PUBLIC)
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

  test('a gene from an unconfirmed-public plugin never appears in gene records or list tags', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = registerGene(l, 'private-plugin:x', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = setCore(l, 'private-plugin:x')

    const plan = buildPublishPlan(l, 'Replicator deus', 'a'.repeat(64), ALL_PUBLIC)

    const geneRecords = plan.filter(r => r.kind === GENE_RECORD_KIND)
    expect(geneRecords.map(r => r.label)).toEqual(['a:a'])

    const lists = plan.filter(r => r.kind === LIST_RECORD_KIND)
    for (const list of lists) {
      const geneKeysInList = list.tags.filter(t => t[0] === 'g').map(t => t[1])
      expect(geneKeysInList).not.toContain('private-plugin:x')
    }
  })

  test('with an empty visibility map, nothing publishes — fail closed', () => {
    const l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    const plan = buildPublishPlan(l, 'Replicator deus', 'a'.repeat(64), {})
    const geneRecords = plan.filter(r => r.kind === GENE_RECORD_KIND)
    expect(geneRecords).toEqual([])
  })
})

describe('buildGistSnapshot', () => {
  test('includes every public gene, not just ones changed since lastPublish', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = registerGene(l, 'b:b', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = { ...l, cycles: { ...l.cycles, lastPublish: '2026-08-20' } }
    l = applyEvent(l, 'b:b', '2026-08-25T03:00:00Z', 'muted', 'decay')

    const snapshot = buildGistSnapshot(l, 'Replicator deus', 'a'.repeat(64), ALL_PUBLIC)
    const geneRecords = snapshot.filter(r => r.kind === GENE_RECORD_KIND)
    expect(geneRecords.map(r => r.label).sort()).toEqual(['a:a', 'b:b'])
  })

  test('still respects the public-repo filter', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = registerGene(l, 'private-plugin:x', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    const snapshot = buildGistSnapshot(l, 'Replicator deus', 'a'.repeat(64), ALL_PUBLIC)
    const geneRecords = snapshot.filter(r => r.kind === GENE_RECORD_KIND)
    expect(geneRecords.map(r => r.label)).toEqual(['a:a'])
  })
})
