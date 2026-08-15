import type { Ledger } from './ledger'
import { buildGeneRecord, buildProfileRecord, type PublishRecord } from './publisher'
import { buildLists } from './lists'

export function selectChangedGenes(ledger: Ledger, sinceISO: string | null): string[] {
  return Object.entries(ledger.genes)
    // `sinceISO` (from `ledger.cycles.lastPublish`, set via `recordPublish`'s
    // `today()`) is date-only (`"2026-08-15"`), while `e.at` is a full ISO
    // timestamp (`"2026-08-15T02:43:39.099Z"`). Comparing them directly is a
    // lexicographic trap: a longer string with a matching date prefix always
    // sorts greater, so every event on the same calendar date as the last
    // publish would spuriously count as "changed". Compare date portions only.
    .filter(([, gene]) => gene.events.some(e => sinceISO === null || e.at.slice(0, 10) > sinceISO))
    .map(([key]) => key)
}

export function buildPublishPlan(ledger: Ledger, speciesName: string, pubkeyHex: string): PublishRecord[] {
  const changed = selectChangedGenes(ledger, ledger.cycles.lastPublish)
  const geneRecords = changed.map(key => buildGeneRecord(key, ledger.genes[key]))
  const listRecords = buildLists(ledger, pubkeyHex)
  const profileRecord = buildProfileRecord(speciesName, ledger.harnessModels)
  return [...geneRecords, ...listRecords, profileRecord]
}
