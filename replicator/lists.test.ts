import { describe, expect, test } from 'bun:test'
import { buildLists } from './lists'
import { LIST_RECORD_KIND } from './publisher'
import { emptyLedger, registerGene, setCore, applyEvent } from './ledger'

describe('buildLists', () => {
  test('core list contains only genes with core: true', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = registerGene(l, 'b:b', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = setCore(l, 'a:a')
    const [core] = buildLists(l)
    expect(core.label).toBe('core')
    expect(core.dTag).toBe('core')
    expect(core.kind).toBe(LIST_RECORD_KIND)
    expect(core.tags).toEqual([['g', 'a:a']])
  })

  test('active list contains only genes with state active, excludes muted', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = registerGene(l, 'b:b', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = applyEvent(l, 'b:b', '2026-09-14T03:00:00Z', 'muted', 'decay')
    const [, active] = buildLists(l)
    expect(active.label).toBe('active')
    expect(active.dTag).toBe('active')
    expect(active.tags).toEqual([['g', 'a:a']])
  })

  test('returns empty tag lists (not an error) when no genes qualify', () => {
    const [core, active] = buildLists(emptyLedger())
    expect(core.tags).toEqual([])
    expect(active.tags).toEqual([])
  })
})
