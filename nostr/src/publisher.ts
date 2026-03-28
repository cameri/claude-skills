import { finalizeEvent, type UnsignedEvent } from 'nostr-tools'
import * as nip04 from 'nostr-tools/nip04'
import * as nip17 from 'nostr-tools/nip17'
import { Relay } from 'nostr-tools/relay'
import { randomBytes } from 'crypto'
import type { NostrEventRaw, RelayEntry, RelayListCache, Stats, IRelayPool } from './types.js'
import { CONTACT_RELAY_LIST_TTL_MS } from './types.js'
import { readConfig, readRelayList, readContactRelayList, writeContactRelayList } from './config.js'
import { pubkey as ownPubkey } from './identity.js'

export const stats: Stats = { messages: { sent: 0, failed: 0 } }

export async function publishToPool(
  event: ReturnType<typeof finalizeEvent>,
  pool: IRelayPool,
): Promise<void> {
  const wss = pool.getConnected()
  if (wss.length === 0) throw new Error('no connected relays')
  const msg = JSON.stringify(['EVENT', event])
  for (const ws of wss) {
    ws.send(msg)
  }
}

export async function publishToUrls(
  event: ReturnType<typeof finalizeEvent>,
  urls: string[],
  timeoutMs = 8000,
): Promise<{ url: string; ok: boolean; reason?: string }[]> {
  return Promise.all(
    urls.map(url =>
      new Promise<{ url: string; ok: boolean; reason?: string }>(resolve => {
        let relay: InstanceType<typeof Relay> | null = null
        const timer = setTimeout(() => {
          try { relay?.close() } catch {}
          resolve({ url, ok: false, reason: 'timeout' })
        }, timeoutMs)
        Relay.connect(url)
          .then(r => {
            relay = r
            return r.publish(event as never)
          })
          .then(() => {
            clearTimeout(timer)
            try { relay?.close() } catch {}
            resolve({ url, ok: true })
          })
          .catch((err: Error) => {
            clearTimeout(timer)
            try { relay?.close() } catch {}
            resolve({ url, ok: false, reason: err.message })
          })
      }),
    ),
  )
}

export function getInboxRelays(cache: RelayListCache): string[] {
  return cache.relays
    .filter(r => !r.marker || r.marker === 'read')
    .map(r => r.url)
}

export function getOwnWriteRelays(): string[] {
  const cache = readRelayList()
  if (!cache) return readConfig().relays
  return cache.relays
    .filter(r => !r.marker || r.marker === 'write')
    .map(r => r.url)
}

// Bug fix: use Promise.all instead of sequential await in for loop
export async function fetchContactRelayList(
  contactPubkey: string,
  pool: IRelayPool,
  force = false,
): Promise<RelayListCache | null> {
  const cached = readContactRelayList(contactPubkey)
  const stale = !cached || (Date.now() - cached.updatedAt) > CONTACT_RELAY_LIST_TTL_MS
  if (cached && !stale && !force) return cached

  const wss = pool.getConnected()
  const events = await Promise.all(
    wss.map(ws =>
      new Promise<NostrEventRaw | null>(resolve => {
        const subId = `crl-${randomBytes(4).toString('hex')}`
        const timer = setTimeout(() => {
          try { ws.removeEventListener('message', handler) } catch {}
          resolve(null)
        }, 6000)
        const handler = (ev: MessageEvent) => {
          let msg: unknown[]
          try { msg = JSON.parse(ev.data as string) } catch { return }
          if (!Array.isArray(msg)) return
          if (msg[0] === 'EVENT' && msg[1] === subId) {
            clearTimeout(timer)
            ws.removeEventListener('message', handler)
            try { ws.send(JSON.stringify(['CLOSE', subId])) } catch {}
            resolve(msg[2] as NostrEventRaw)
          } else if (msg[0] === 'EOSE' && msg[1] === subId) {
            clearTimeout(timer)
            ws.removeEventListener('message', handler)
            resolve(null)
          }
        }
        ws.addEventListener('message', handler)
        ws.send(JSON.stringify(['REQ', subId, { kinds: [10002], authors: [contactPubkey], limit: 1 }]))
      }),
    ),
  )

  let best: NostrEventRaw | null = null
  for (const event of events) {
    if (event && (!best || event.created_at > best.created_at)) best = event
  }

  if (!best) return cached ?? null

  const relays: RelayEntry[] = best.tags
    .filter((t: string[]) => t[0] === 'r' && typeof t[1] === 'string')
    .map((t: string[]) => ({ url: t[1], ...(t[2] ? { marker: t[2] as 'read' | 'write' } : {}) }))

  const cache: RelayListCache = {
    relays,
    event_id: best.id,
    created_at: best.created_at,
    updatedAt: Date.now(),
  }
  writeContactRelayList(contactPubkey, cache)
  return cache
}

export async function resolveTargetRelays(
  recipientPubkey: string,
  pool: IRelayPool,
  force = false,
): Promise<string[]> {
  const contactCache = await fetchContactRelayList(recipientPubkey, pool, force)
  const inboxRelays = contactCache ? getInboxRelays(contactCache) : []
  const ownWriteRelays = getOwnWriteRelays()
  const merged = Array.from(new Set([...inboxRelays, ...ownWriteRelays]))
  return merged.length > 0 ? merged : readConfig().relays
}

// Bug fix: check retry result, throw on total delivery failure, only increment sent on success
export async function sendDm(
  recipientPubkey: string,
  text: string,
  sk: Uint8Array,
  pubkey: string,
  pool: IRelayPool,
): Promise<string> {
  const encrypted = await nip04.encrypt(sk, recipientPubkey, text)
  const unsigned: UnsignedEvent = {
    kind: 4,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['p', recipientPubkey]],
    content: encrypted,
    pubkey,
  }
  const signed = finalizeEvent(unsigned, sk)
  const relayUrls = await resolveTargetRelays(recipientPubkey, pool)
  const results = await publishToUrls(signed, relayUrls)
  if (results.every(r => !r.ok)) {
    const retryUrls = await resolveTargetRelays(recipientPubkey, pool, true)
    const retryResults = await publishToUrls(signed, retryUrls)
    if (retryResults.every(r => !r.ok)) {
      stats.messages.failed++
      throw new Error('DM delivery failed to all relays')
    }
  }
  stats.messages.sent++
  return signed.id
}

// Bug fix: check retry result, throw on total delivery failure, only increment sent on success
export async function sendDm17(
  recipientPubkey: string,
  text: string,
  sk: Uint8Array,
  pool: IRelayPool,
): Promise<string> {
  const giftWrap = nip17.wrapEvent(sk, { publicKey: recipientPubkey }, text)
  const relayUrls = await resolveTargetRelays(recipientPubkey, pool)
  const results = await publishToUrls(giftWrap, relayUrls)
  if (results.every(r => !r.ok)) {
    const retryUrls = await resolveTargetRelays(recipientPubkey, pool, true)
    const retryResults = await publishToUrls(giftWrap, retryUrls)
    if (retryResults.every(r => !r.ok)) {
      stats.messages.failed++
      throw new Error('NIP-17 DM delivery failed to all relays')
    }
  }
  stats.messages.sent++
  return giftWrap.id
}

export async function sendNote(
  text: string,
  sk: Uint8Array,
  pubkey: string,
  pool: IRelayPool,
  replyToEventId?: string,
  replyToPubkey?: string,
  mentionPubkeys?: string[],
): Promise<string> {
  const tags: string[][] = []
  if (replyToEventId) tags.push(['e', replyToEventId, '', 'reply'])
  if (replyToPubkey) tags.push(['p', replyToPubkey])
  for (const mp of mentionPubkeys ?? []) {
    if (mp !== replyToPubkey) tags.push(['p', mp])
  }
  const unsigned: UnsignedEvent = {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: text,
    pubkey,
  }
  const signed = finalizeEvent(unsigned, sk)
  await publishToPool(signed, pool)
  return signed.id
}

export async function sendReaction(
  targetEventId: string,
  content: string,
  sk: Uint8Array,
  pubkey: string,
  pool: IRelayPool,
  authorPubkey?: string,
  targetKind?: number,
): Promise<string> {
  const tags: string[][] = [['e', targetEventId]]
  if (authorPubkey) tags.push(['p', authorPubkey])
  if (targetKind !== undefined) tags.push(['k', String(targetKind)])
  const unsigned: UnsignedEvent = {
    kind: 7,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content,
    pubkey,
  }
  const signed = finalizeEvent(unsigned, sk)
  await publishToPool(signed, pool)
  stats.messages.sent++
  return signed.id
}

export async function fetchEvent(
  filter: Record<string, unknown>,
  pool: IRelayPool,
  timeoutMs = 5000,
): Promise<NostrEventRaw | null> {
  const wss = pool.getConnected()
  if (wss.length === 0) throw new Error('no connected relays')

  return new Promise(resolve => {
    const subId = `fetch-${randomBytes(4).toString('hex')}`
    let found = false
    const timer = setTimeout(() => {
      if (!found) resolve(null)
      for (const ws of wss) {
        try { ws.send(JSON.stringify(['CLOSE', subId])) } catch {}
      }
    }, timeoutMs)

    for (const ws of wss) {
      const handler = (ev: MessageEvent) => {
        let msg: unknown[]
        try { msg = JSON.parse(ev.data as string) } catch { return }
        if (!Array.isArray(msg)) return
        if (msg[0] === 'EVENT' && msg[1] === subId) {
          if (!found) {
            found = true
            clearTimeout(timer)
            try { ws.send(JSON.stringify(['CLOSE', subId])) } catch {}
            ws.removeEventListener('message', handler)
            resolve(msg[2] as NostrEventRaw)
          }
        } else if (msg[0] === 'EOSE' && msg[1] === subId) {
          ws.removeEventListener('message', handler)
        }
      }
      ws.addEventListener('message', handler)
      ws.send(JSON.stringify(['REQ', subId, filter]))
    }
  })
}

export async function fetchRelayListFromUrl(
  url: string,
  targetPubkey = ownPubkey,
  timeoutMs = 6000,
): Promise<NostrEventRaw | null> {
  let relay: InstanceType<typeof Relay> | null = null
  try {
    relay = await Promise.race([
      Relay.connect(url),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('connect timeout')), timeoutMs),
      ),
    ])
    return await new Promise<NostrEventRaw | null>(resolve => {
      const timer = setTimeout(() => resolve(null), timeoutMs)
      relay!.subscribe(
        [{ kinds: [10002], authors: [targetPubkey], limit: 1 }],
        {
          onevent(event) {
            clearTimeout(timer)
            resolve(event as unknown as NostrEventRaw)
          },
          oneose() {
            clearTimeout(timer)
            resolve(null)
          },
        },
      )
    })
  } catch {
    return null
  } finally {
    try { relay?.close() } catch {}
  }
}
