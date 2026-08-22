import * as nip19 from 'nostr-tools/nip19'
import type { Ledger } from './ledger'
import { GENE_RECORD_KIND, LIST_RECORD_KIND, type PublishRecord } from './publisher'

export const ANNOUNCEMENT_KIND = 1

// naddr, not nevent — GENE_RECORD_KIND/LIST_RECORD_KIND are addressable
// (NIP-01: kind in [30000,40000)), identified by kind+pubkey+d-tag rather
// than a fixed event id. An nevent would point at this cycle's specific
// event id, which goes stale the moment the same address is republished
// with new content; naddr resolves to whatever is currently stored there.
function geneAddr(key: string, pubkeyHex: string): string {
  return nip19.naddrEncode({ identifier: key, pubkey: pubkeyHex, kind: GENE_RECORD_KIND })
}

function listAddr(dTag: string, pubkeyHex: string): string {
  return nip19.naddrEncode({ identifier: dTag, pubkey: pubkeyHex, kind: LIST_RECORD_KIND })
}

// One kind-1 note per publish cycle that actually changed something,
// announcing the changed genes with nostr: naddr mentions plus structured
// `a` tags (same `${kind}:${pubkey}:${dTag}` shape lists.ts already uses)
// so clients can resolve the reference either way. Returns null when
// `changed` is empty — callers should skip publishing entirely rather than
// send an empty announcement.
//
// Note: unlike the addressable gene/list records, this kind-1 note is NOT
// idempotent — if an unrelated record in the same publish batch fails and
// the cycle retries with the same `changed` set, this note would be sent
// again. Accepted as a rare, low-cost edge case rather than adding dedup
// machinery for it.
export function buildAnnouncementRecord(changed: string[], ledger: Ledger, pubkeyHex: string): PublishRecord | null {
  if (changed.length === 0) return null

  const lines = changed.map(key => `• ${key} (${ledger.genes[key].state}) — nostr:${geneAddr(key, pubkeyHex)}`)
  const content = [
    `🧬 ${changed.length} gene${changed.length === 1 ? '' : 's'} updated`,
    '',
    ...lines,
    '',
    `Active list: nostr:${listAddr('active', pubkeyHex)}`,
  ].join('\n')

  const tags: string[][] = [
    ...changed.map(key => ['a', `${GENE_RECORD_KIND}:${pubkeyHex}:${key}`]),
    ['a', `${LIST_RECORD_KIND}:${pubkeyHex}:active`],
  ]

  return { label: 'announcement', kind: ANNOUNCEMENT_KIND, content, tags }
}
