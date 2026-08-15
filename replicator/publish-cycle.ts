import type { Ledger } from './ledger'
import { buildGeneRecord, buildProfileRecord, type PublishRecord } from './publisher'
import { buildLists } from './lists'
import { isPublicSource, type VisibilityMap } from './repo-visibility'

// Genes whose plugin isn't confirmed to live in a public repo never reach
// the redacted record, the changed-gene diff, or the core/active lists —
// filtered here, once, before any of those consume the ledger's genes.
export function filterPublicGenes(ledger: Ledger, visibility: VisibilityMap): Ledger {
  const genes = Object.fromEntries(Object.entries(ledger.genes).filter(([key]) => isPublicSource(visibility, key)))
  return { ...ledger, genes }
}

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

export function buildPublishPlan(
  ledger: Ledger,
  speciesName: string,
  pubkeyHex: string,
  visibility: VisibilityMap,
): PublishRecord[] {
  const publishable = filterPublicGenes(ledger, visibility)
  const changed = selectChangedGenes(publishable, publishable.cycles.lastPublish)
  const geneRecords = changed.map(key => buildGeneRecord(key, publishable.genes[key]))
  const listRecords = buildLists(publishable, pubkeyHex)
  const profileRecord = buildProfileRecord(speciesName, publishable.harnessModels)
  return [...geneRecords, ...listRecords, profileRecord]
}

// Nostr's replaceable gene events persist on relays untouched between
// cycles, so only publishing the delta is correct there. A gist file has no
// such persistence of its own — last write wins — so its snapshot always
// carries every currently-public gene, not just what changed this cycle.
export function buildGistSnapshot(
  ledger: Ledger,
  speciesName: string,
  pubkeyHex: string,
  visibility: VisibilityMap,
): PublishRecord[] {
  const publishable = filterPublicGenes(ledger, visibility)
  const geneRecords = Object.keys(publishable.genes).map(key => buildGeneRecord(key, publishable.genes[key]))
  const listRecords = buildLists(publishable, pubkeyHex)
  const profileRecord = buildProfileRecord(speciesName, publishable.harnessModels)
  return [...geneRecords, ...listRecords, profileRecord]
}
