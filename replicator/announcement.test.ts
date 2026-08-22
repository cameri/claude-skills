import { describe, expect, test } from 'bun:test'
import * as nip19 from 'nostr-tools/nip19'
import { buildAnnouncementRecord, ANNOUNCEMENT_KIND } from './announcement'
import { GENE_RECORD_KIND, LIST_RECORD_KIND } from './publisher'
import { emptyLedger, registerGene, applyEvent } from './ledger'

const PUBKEY_HEX = 'a'.repeat(64)

describe('buildAnnouncementRecord', () => {
  test('returns null when nothing changed', () => {
    const l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    expect(buildAnnouncementRecord([], l, PUBKEY_HEX)).toBeNull()
  })

  test('is a kind-1 note labeled "announcement"', () => {
    const l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    const record = buildAnnouncementRecord(['a:a'], l, PUBKEY_HEX)
    expect(record?.kind).toBe(1)
    expect(record?.kind).toBe(ANNOUNCEMENT_KIND)
    expect(record?.label).toBe('announcement')
  })

  test('content mentions each changed gene key and its state', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = registerGene(l, 'b:b', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = applyEvent(l, 'b:b', '2026-08-20T03:00:00Z', 'muted', 'decay')
    const record = buildAnnouncementRecord(['a:a', 'b:b'], l, PUBKEY_HEX)
    expect(record?.content).toContain('a:a (active)')
    expect(record?.content).toContain('b:b (muted)')
  })

  test('embeds a valid naddr per changed gene, decodable back to kind/pubkey/identifier', () => {
    const l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    const record = buildAnnouncementRecord(['a:a'], l, PUBKEY_HEX)
    const match = /nostr:(naddr1[a-z0-9]+)/.exec(record!.content)
    expect(match).not.toBeNull()
    const decoded = nip19.decode(match![1])
    expect(decoded.type).toBe('naddr')
    expect(decoded.data).toEqual({ identifier: 'a:a', pubkey: PUBKEY_HEX, kind: GENE_RECORD_KIND, relays: [] })
  })

  test('embeds a valid naddr for the active list', () => {
    const l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    const record = buildAnnouncementRecord(['a:a'], l, PUBKEY_HEX)
    const matches = [...record!.content.matchAll(/nostr:(naddr1[a-z0-9]+)/g)]
    const listNaddr = matches[matches.length - 1][1]
    const decoded = nip19.decode(listNaddr)
    expect(decoded.type).toBe('naddr')
    expect(decoded.data).toEqual({ identifier: 'active', pubkey: PUBKEY_HEX, kind: LIST_RECORD_KIND, relays: [] })
  })

  test('emits an `a` tag per changed gene plus one for the active list', () => {
    let l = registerGene(emptyLedger(), 'a:a', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    l = registerGene(l, 'b:b', 'preexisting', '2026-08-14T03:00:00Z', '2026-08-14')
    const record = buildAnnouncementRecord(['a:a', 'b:b'], l, PUBKEY_HEX)
    expect(record?.tags).toEqual([
      ['a', `${GENE_RECORD_KIND}:${PUBKEY_HEX}:a:a`],
      ['a', `${GENE_RECORD_KIND}:${PUBKEY_HEX}:b:b`],
      ['a', `${LIST_RECORD_KIND}:${PUBKEY_HEX}:active`],
    ])
  })
})
