import type { Ledger } from './ledger'
import { LIST_RECORD_KIND, type PublishRecord } from './publisher'

export function buildLists(ledger: Ledger): PublishRecord[] {
  const core = Object.entries(ledger.genes).filter(([, g]) => g.core).map(([k]) => k)
  const active = Object.entries(ledger.genes).filter(([, g]) => g.state === 'active').map(([k]) => k)
  return [
    { label: 'core', kind: LIST_RECORD_KIND, dTag: 'core', content: '', tags: core.map(k => ['g', k]) },
    { label: 'active', kind: LIST_RECORD_KIND, dTag: 'active', content: '', tags: active.map(k => ['g', k]) },
  ]
}
