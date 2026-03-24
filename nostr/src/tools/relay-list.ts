import { finalizeEvent, type UnsignedEvent } from 'nostr-tools'
import type { Ctx, RelayEntry, RelayListCache } from '../types.js'
import { publishToPool, fetchRelayListFromUrl } from '../publisher.js'
import { readRelayList, writeRelayList } from '../config.js'

export async function handleRelayList(
  tool: 'publish_relay_list' | 'get_relay_list',
  args: Record<string, unknown>,
  ctx: Ctx,
): Promise<{ content: { type: string; text: string }[]; isError?: boolean }> {
  const { sk, pubkey, pool } = ctx

  if (tool === 'get_relay_list') {
    const fetchRemote = (args.fetch_remote as boolean | undefined) ?? false
    const localCache = readRelayList()

    if (!fetchRemote) {
      if (!localCache) {
        return { content: [{ type: 'text', text: 'No local relay list cache found. Use publish_relay_list to create one.' }] }
      }
      return { content: [{ type: 'text', text: JSON.stringify(localCache, null, 2) }] }
    }

    const writeRelays = (localCache?.relays ?? [])
      .filter(r => !r.marker || r.marker === 'write')
      .map(r => r.url)

    if (writeRelays.length === 0) {
      return { content: [{ type: 'text', text: 'No write relays in local cache to fetch from.' }] }
    }

    const remoteChecks = await Promise.all(
      writeRelays.map(async url => ({
        url,
        event: await fetchRelayListFromUrl(url, pubkey),
      })),
    )

    const lines = remoteChecks.map(r => {
      if (!r.event) return `${r.url}: not found / timeout`
      const relayTags = r.event.tags
        .filter(t => t[0] === 'r')
        .map(t => `    ${t[1]}${t[2] ? ` (${t[2]})` : ''}`)
        .join('\n')
      return `${r.url}: created_at=${r.event.created_at} id=${r.event.id}\n${relayTags}`
    })

    return {
      content: [{
        type: 'text',
        text:
          `Local cache:\n${localCache ? JSON.stringify(localCache, null, 2) : 'none'}\n\n` +
          `Remote (write relays):\n${lines.join('\n\n')}`,
      }],
    }
  }

  // publish_relay_list
  const relays = args.relays as RelayEntry[]
  const force = (args.force as boolean | undefined) ?? false

  const newWriteRelays = relays
    .filter(r => !r.marker || r.marker === 'write')
    .map(r => r.url)
  const cachedWriteRelays = (readRelayList()?.relays ?? [])
    .filter(r => !r.marker || r.marker === 'write')
    .map(r => r.url)
  const allWriteRelays = Array.from(new Set([...newWriteRelays, ...cachedWriteRelays]))

  const localCache = readRelayList()
  const remoteChecks = await Promise.all(
    allWriteRelays.map(async url => ({
      url,
      event: await fetchRelayListFromUrl(url, pubkey),
    })),
  )

  const conflicts = remoteChecks.filter(
    r => r.event && r.event.created_at > (localCache?.created_at ?? 0),
  )

  if (conflicts.length > 0 && !force) {
    const conflictInfo = conflicts.map(c => ({
      relay: c.url,
      remote_created_at: c.event!.created_at,
      remote_relays: c.event!.tags
        .filter(t => t[0] === 'r')
        .map(t => ({ url: t[1], marker: t[2] ?? null })),
    }))
    return {
      content: [{
        type: 'text',
        text:
          `Conflict: ${conflicts.length} write relay(s) have a newer kind:10002 than local cache.\n` +
          `Local cache created_at: ${localCache?.created_at ?? 'none'}\n` +
          `Set force:true to override, or update your relay list to merge these entries.\n\n` +
          JSON.stringify(conflictInfo, null, 2),
      }],
      isError: true,
    }
  }

  const tags = relays.map(r => (r.marker ? ['r', r.url, r.marker] : ['r', r.url]))
  const unsigned: UnsignedEvent = {
    kind: 10002,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: '',
    pubkey,
  }
  const signed = finalizeEvent(unsigned, sk)
  await publishToPool(signed, pool)

  const cache: RelayListCache = {
    relays,
    event_id: signed.id,
    created_at: signed.created_at,
    updatedAt: Date.now(),
  }
  writeRelayList(cache)

  const remoteStatus = remoteChecks
    .map(r => `  ${r.url}: ${r.event ? `found (created_at ${r.event.created_at})` : 'not found / timeout'}`)
    .join('\n')

  return {
    content: [{
      type: 'text',
      text:
        `Published relay list (kind:10002). Event ID: ${signed.id}\n` +
        `Remote state before publish:\n${remoteStatus}\n\n` +
        JSON.stringify(cache, null, 2),
    }],
  }
}
