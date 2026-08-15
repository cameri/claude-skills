import { describe, expect, test } from 'bun:test'
import { buildLists } from './lists'
import { GENE_RECORD_KIND, LIST_RECORD_KIND } from './publisher'
import { emptyLedger, registerGene, setCore, applyEvent } from './ledger'

const PUBKEY_HEX = 'a'.repeat(64)

describe('buildLists', () => {
  test('core list contains only genes with core: true, with both g and a tags', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = registerGene(l, 'b:b', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = setCore(l, 'a:a')
    const [core] = buildLists(l, PUBKEY_HEX)
    expect(core.label).toBe('core')
    expect(core.dTag).toBe('core')
    expect(core.kind).toBe(LIST_RECORD_KIND)
    expect(core.tags).toEqual([
      ['g', 'a:a'],
      ['a', `${GENE_RECORD_KIND}:${PUBKEY_HEX}:a:a`],
    ])
  })

  test('active list contains only genes with state active, excludes muted, with both g and a tags', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = registerGene(l, 'b:b', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = applyEvent(l, 'b:b', '2026-09-14T03:00:00Z', 'muted', 'decay')
    const [, active] = buildLists(l, PUBKEY_HEX)
    expect(active.label).toBe('active')
    expect(active.dTag).toBe('active')
    expect(active.tags).toEqual([
      ['g', 'a:a'],
      ['a', `${GENE_RECORD_KIND}:${PUBKEY_HEX}:a:a`],
    ])
  })

  test('returns empty tag lists (not an error) when no genes qualify', () => {
    const [core, active] = buildLists(emptyLedger(), PUBKEY_HEX)
    expect(core.tags).toEqual([])
    expect(active.tags).toEqual([])
  })

  test('emits an a tag pointing at each gene\'s addressable event for every listed key', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = registerGene(l, 'b:b', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = setCore(l, 'a:a')
    l = setCore(l, 'b:b')
    const [core] = buildLists(l, PUBKEY_HEX)
    const aTags = core.tags.filter(t => t[0] === 'a')
    expect(aTags).toEqual([
      ['a', `${GENE_RECORD_KIND}:${PUBKEY_HEX}:a:a`],
      ['a', `${GENE_RECORD_KIND}:${PUBKEY_HEX}:b:b`],
    ])
  })
})
