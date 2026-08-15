import { finalizeEvent, type UnsignedEvent, type Event as NostrEvent } from 'nostr-tools'
import { Relay } from 'nostr-tools/relay'
import type { Publisher, PublishRecord, PublishResult } from './publisher'

export function buildSignedEvent(record: PublishRecord, sk: Uint8Array, pubkey: string): NostrEvent {
  const dTagEntry: string[][] = record.dTag !== undefined ? [['d', record.dTag]] : []
  const unsigned: UnsignedEvent = {
    kind: record.kind,
    created_at: Math.floor(Date.now() / 1000),
    tags: [...dTagEntry, ...record.tags],
    content: record.content,
    pubkey,
  }
  return finalizeEvent(unsigned, sk)
}

function publishToUrl(
  event: NostrEvent,
  url: string,
  timeoutMs = 8000,
): Promise<{ ok: boolean; reason?: string }> {
  return new Promise(resolve => {
    let relay: InstanceType<typeof Relay> | null = null
    const timer = setTimeout(() => {
      try { relay?.close() } catch {}
      resolve({ ok: false, reason: `${url}: timeout` })
    }, timeoutMs)
    Relay.connect(url)
      .then(r => {
        relay = r
        return r.publish(event as never)
      })
      .then(() => {
        clearTimeout(timer)
        try { relay?.close() } catch {}
        resolve({ ok: true })
      })
      .catch((err: Error) => {
        clearTimeout(timer)
        try { relay?.close() } catch {}
        resolve({ ok: false, reason: `${url}: ${err.message}` })
      })
  })
}

export class NostrPublisher implements Publisher {
  constructor(
    private sk: Uint8Array,
    private pubkey: string,
    private relayUrls: string[],
  ) {}

  async publish(records: PublishRecord[]): Promise<PublishResult[]> {
    return Promise.all(records.map(record => this.publishOne(record)))
  }

  private async publishOne(record: PublishRecord): Promise<PublishResult> {
    const signed = buildSignedEvent(record, this.sk, this.pubkey)
    const results = await Promise.all(this.relayUrls.map(url => publishToUrl(signed, url)))
    const ok = results.some(r => r.ok)
    if (ok) return { label: record.label, ok: true }
    return { label: record.label, ok: false, reason: results.map(r => r.reason).join('; ') }
  }
}
