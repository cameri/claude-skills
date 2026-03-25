import * as nip19 from 'nostr-tools/nip19'
import type { Ctx } from '../types.js'
import { sendReaction } from '../publisher.js'

export async function handleReact(
  args: Record<string, unknown>,
  ctx: Ctx,
): Promise<{ content: { type: string; text: string }[] }> {
  let eventId = args.event_id as string
  let authorPubkey = args.author_pubkey as string | undefined
  const content = (args.content as string | undefined) ?? '+'
  const targetKind = args.target_kind as number | undefined

  // Decode bech32 event ID
  if (eventId.startsWith('note1') || eventId.startsWith('nevent1')) {
    const decoded = nip19.decode(eventId)
    if (decoded.type === 'note') {
      eventId = decoded.data as string
    } else if (decoded.type === 'nevent') {
      const d = decoded.data as { id: string; author?: string }
      eventId = d.id
      if (!authorPubkey && d.author) authorPubkey = d.author
    } else {
      throw new Error('invalid event ID format')
    }
  }

  // Decode bech32 author pubkey
  if (authorPubkey?.startsWith('npub1')) {
    const decoded = nip19.decode(authorPubkey)
    if (decoded.type !== 'npub') throw new Error('invalid npub for author_pubkey')
    authorPubkey = decoded.data as string
  }

  const reactionEventId = await sendReaction(
    eventId,
    content,
    ctx.sk,
    ctx.pubkey,
    ctx.pool,
    authorPubkey,
    targetKind,
  )

  return {
    content: [{
      type: 'text',
      text: `Reaction published. Event ID: ${reactionEventId}\nnote1: ${nip19.noteEncode(reactionEventId)}`,
    }],
  }
}
