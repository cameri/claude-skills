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
  // `reason` is free text and publishes permanently to public relays — dropped.
  const events = gene.events.map(({ at, type }) => ({ at, type }))
  const redacted = { origin: gene.origin, born: gene.born, state: gene.state, events }
  return { label: key, kind: GENE_RECORD_KIND, dTag: key, content: JSON.stringify(redacted), tags: [] }
}

export function buildProfileRecord(name: string, harnessModels: HarnessModel[]): PublishRecord {
  return { label: 'profile', kind: 0, content: JSON.stringify({ name, harnessModels }), tags: [] }
}
