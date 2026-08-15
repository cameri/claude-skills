import type { Ledger } from './ledger'
import { GENE_RECORD_KIND, LIST_RECORD_KIND, type PublishRecord } from './publisher'

export function buildLists(ledger: Ledger, pubkeyHex: string): PublishRecord[] {
  const core = Object.entries(ledger.genes).filter(([, g]) => g.core).map(([k]) => k)
  const active = Object.entries(ledger.genes).filter(([, g]) => g.state === 'active').map(([k]) => k)
  const tagsFor = (keys: string[]): string[][] =>
    keys.flatMap(k => [
      ['g', k],
      ['a', `${GENE_RECORD_KIND}:${pubkeyHex}:${k}`],
    ])
  return [
    { label: 'core', kind: LIST_RECORD_KIND, dTag: 'core', content: '', tags: tagsFor(core) },
    { label: 'active', kind: LIST_RECORD_KIND, dTag: 'active', content: '', tags: tagsFor(active) },
  ]
}
