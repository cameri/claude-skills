import { describe, expect, test } from 'bun:test'
import { selectChangedGenes } from './publish-cycle'
import { emptyLedger, registerGene, applyEvent } from './ledger'

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
    expect(selectChangedGenes(l, '2026-08-15T00:00:00Z')).toEqual(['b:b'])
  })

  test('returns nothing when no gene has changed since sinceISO', () => {
    const l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    expect(selectChangedGenes(l, '2026-08-15T00:00:00Z')).toEqual([])
  })
})
