import { finalizeEvent, type UnsignedEvent, type Event as NostrEvent } from 'nostr-tools'
import { SimplePool } from 'nostr-tools/pool'
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

function describeRejection(err: unknown): string {
  return String((err as { message?: string } | undefined)?.message ?? err)
}

// SimplePool resolves (never rejects) a connection failure as this exact
// prefixed string, so a plain fulfilled/rejected check would miscount it as success.
const CONNECTION_FAILURE_PREFIX = 'connection failure: '

export function isRealSuccess(value: unknown): boolean {
  return typeof value === 'string' && !value.startsWith(CONNECTION_FAILURE_PREFIX)
}

const DEFAULT_PUBLISH_DELAY_MS = 300

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export class NostrPublisher implements Publisher {
  private pool = new SimplePool()

  constructor(
    private sk: Uint8Array,
    private pubkey: string,
    private relayUrls: string[],
    private delayMs: number = DEFAULT_PUBLISH_DELAY_MS,
  ) {}

  // Sequential with a pace, not Promise.all — firing 100+ records at once
  // reads as spam to a relay's own rate limiter (confirmed live: damus.io
  // returned "rate-limited: you are noting too much" partway through the
  // real 127-record first publish).
  async publish(records: PublishRecord[]): Promise<PublishResult[]> {
    const results: PublishResult[] = []
    for (const [i, record] of records.entries()) {
      results.push(await this.publishOne(record))
      if (i < records.length - 1) await sleep(this.delayMs)
    }
    return results
  }

  close(): void {
    this.pool.close(this.relayUrls)
  }

  private async publishOne(record: PublishRecord): Promise<PublishResult> {
    const signed = buildSignedEvent(record, this.sk, this.pubkey)
    const settled = await Promise.allSettled(this.pool.publish(this.relayUrls, signed))
    const ok = settled.some(r => r.status === 'fulfilled' && isRealSuccess(r.value))
    if (ok) return { label: record.label, ok: true }
    const reason = settled
      .map((r, i) => {
        if (r.status === 'rejected') return `${this.relayUrls[i]}: ${describeRejection(r.reason)}`
        return `${this.relayUrls[i]}: ${String(r.value)}`
      })
      .join('; ')
    return { label: record.label, ok: false, reason }
  }
}
