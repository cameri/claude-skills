import * as nip19 from 'nostr-tools/nip19'
import type { Ctx } from '../types.js'
import { fetchEvent } from '../publisher.js'

export async function handleFetch(
  args: Record<string, unknown>,
  ctx: Ctx,
): Promise<{ content: { type: string; text: string }[] }> {
  const timeoutMs = (args.timeout_ms as number | undefined) ?? 5000
  const filter: Record<string, unknown> = {}

  if (args.event_id) {
    let id = args.event_id as string
    if (id.startsWith('note1')) {
      const d = nip19.decode(id)
      if (d.type === 'note') id = d.data as string
    } else if (id.startsWith('nevent1')) {
      const d = nip19.decode(id)
      if (d.type === 'nevent') id = (d.data as nip19.EventPointer).id
    }
    filter.ids = [id]
  }
  if (args.pubkey) {
    let pk = args.pubkey as string
    if (pk.startsWith('npub1')) {
      const d = nip19.decode(pk)
      if (d.type === 'npub') pk = d.data as string
    }
    filter.authors = [pk]
  }
  if (args.kinds) filter.kinds = args.kinds
  filter.limit = (args.limit as number | undefined) ?? 1

  if (Object.keys(filter).length === 1 && 'limit' in filter) {
    throw new Error('provide at least one filter: event_id, pubkey, or kinds')
  }

  const event = await fetchEvent(filter, ctx.pool, timeoutMs)
  if (!event) return { content: [{ type: 'text', text: 'No event found.' }] }

  const result = {
    ...event,
    npub: nip19.npubEncode(event.pubkey),
    note_id: nip19.noteEncode(event.id),
  }
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
}
