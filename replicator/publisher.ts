import type { Gene, HarnessModel } from './ledger'

export const GENE_RECORD_KIND = 32100
export const LIST_RECORD_KIND = 32101

export type PublishRecord = {
  label: string
  kind: number
  dTag?: string
  content: string
  tags: string[][]
}

export type PublishResult = {
  label: string
  ok: boolean
  reason?: string
}

export interface Publisher {
  publish(records: PublishRecord[]): Promise<PublishResult[]>
}

export function buildGeneRecord(key: string, gene: Gene): PublishRecord {
  // `reason` is the one open-ended, free-text field on a gene event — every
  // other field here is a fixed enum or a date. It publishes permanently to
  // public relays, so it's dropped: `type` + `at` already carry the useful
  // cross-replicator signal (what happened, when) without the narrative
  // explanation, which could describe session-specific context never meant
  // to be public. Cameri, 2026-08-15.
  const events = gene.events.map(({ at, type }) => ({ at, type }))
  const redacted = { origin: gene.origin, born: gene.born, state: gene.state, events }
  return { label: key, kind: GENE_RECORD_KIND, dTag: key, content: JSON.stringify(redacted), tags: [] }
}

export function buildProfileRecord(name: string, harnessModels: HarnessModel[]): PublishRecord {
  return { label: 'profile', kind: 0, content: JSON.stringify({ name, harnessModels }), tags: [] }
}
