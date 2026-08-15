import { describe, expect, test } from 'bun:test'
import { verifyEvent } from 'nostr-tools'
import { buildSignedEvent } from './nostr-publisher'
import { generateKeypair } from './identity'
import { GENE_RECORD_KIND, LIST_RECORD_KIND, type PublishRecord } from './publisher'

describe('buildSignedEvent', () => {
  test('produces a valid, verifiable signed event with the record dTag as the d tag', () => {
    const kp = generateKeypair()
    const record: PublishRecord = {
      label: 'foo:bar',
      dTag: 'foo:bar',
      kind: GENE_RECORD_KIND,
      content: '{"origin":"inward"}',
      tags: [],
    }
    const event = buildSignedEvent(record, kp.sk, kp.pubkeyHex)
    expect(verifyEvent(event)).toBe(true)
    expect(event.kind).toBe(GENE_RECORD_KIND)
    expect(event.pubkey).toBe(kp.pubkeyHex)
    expect(event.content).toBe('{"origin":"inward"}')
    expect(event.tags).toEqual([['d', 'foo:bar']])
  })

  test('preserves extra tags after the d tag', () => {
    const kp = generateKeypair()
    const record: PublishRecord = {
      label: 'core',
      dTag: 'core',
      kind: LIST_RECORD_KIND,
      content: '',
      tags: [['g', 'foo:bar'], ['g', 'baz:qux']],
    }
    const event = buildSignedEvent(record, kp.sk, kp.pubkeyHex)
    expect(event.tags).toEqual([['d', 'core'], ['g', 'foo:bar'], ['g', 'baz:qux']])
  })

  test('omits the d tag entirely when the record has none (e.g. a kind:0 profile event)', () => {
    const kp = generateKeypair()
    const record: PublishRecord = { label: 'profile', kind: 0, content: '{"name":"Replicator deus"}', tags: [] }
    const event = buildSignedEvent(record, kp.sk, kp.pubkeyHex)
    expect(event.tags).toEqual([])
    expect(verifyEvent(event)).toBe(true)
  })
})
