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

// nostr-tools relay/pool operations can reject with a plain string, not an
// Error — a string has no `.message`, so assuming one produces the literal
// text "undefined" in failure messages. Handle both shapes.
function describeRejection(err: unknown): string {
  return String((err as { message?: string } | undefined)?.message ?? err)
}

// SimplePool.publish()'s per-relay promise does not reject on a connection
// failure the way it does on an explicit relay rejection or timeout — its
// internal ensureRelay() catch block instead *resolves* with a string
// prefixed exactly "connection failure: " (verified against the installed
// nostr-tools/lib/esm/abstract-pool.js). A genuine successful publish
// resolves with the relay's own OK-message `reason` field, which per NIP-01
// is normally empty and is never this literal prefix. Without this check,
// every relay being unreachable would still read back as `ok: true`.
const CONNECTION_FAILURE_PREFIX = 'connection failure: '

export function isRealSuccess(value: unknown): boolean {
  return typeof value === 'string' && !value.startsWith(CONNECTION_FAILURE_PREFIX)
}

export class NostrPublisher implements Publisher {
  // One SimplePool for the whole publisher's lifetime: nostr-tools reuses
  // (or opens once) a single connection per relay URL across every publish
  // made through it, regardless of how many events are published — this is
  // what collapses N-records × M-relays simultaneous connections down to
  // just M.
  private pool = new SimplePool()

  constructor(
    private sk: Uint8Array,
    private pubkey: string,
    private relayUrls: string[],
  ) {}

  async publish(records: PublishRecord[]): Promise<PublishResult[]> {
    return Promise.all(records.map(record => this.publishOne(record)))
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
