import * as nip19 from 'nostr-tools/nip19'
import type { Ctx } from '../types.js'
import { sendDm, sendDm17, sendNote } from '../publisher.js'

export async function handleSend(
  tool: 'send_dm' | 'send_dm_nip17' | 'send_note',
  args: Record<string, unknown>,
  ctx: Ctx,
): Promise<{ content: { type: string; text: string }[] }> {
  const { sk, pubkey, pool } = ctx

  if (tool === 'send_dm') {
    let recipient = args.recipient as string
    if (recipient.startsWith('npub1')) {
      const decoded = nip19.decode(recipient)
      if (decoded.type !== 'npub') throw new Error('invalid npub')
      recipient = decoded.data as string
    }
    const eventId = await sendDm(recipient, args.text as string, sk, pubkey, pool)
    return { content: [{ type: 'text', text: `Sent DM. Event ID: ${eventId}` }] }
  }

  if (tool === 'send_dm_nip17') {
    let recipient = args.recipient as string
    if (recipient.startsWith('npub1')) {
      const decoded = nip19.decode(recipient)
      if (decoded.type !== 'npub') throw new Error('invalid npub')
      recipient = decoded.data as string
    }
    const eventId = await sendDm17(recipient, args.text as string, sk, pool)
    return { content: [{ type: 'text', text: `Sent NIP-17 DM. Event ID: ${eventId}` }] }
  }

  // send_note
  let replyToEventId = args.reply_to_event_id as string | undefined
  let replyToPubkey = args.reply_to_pubkey as string | undefined
  if (replyToEventId?.startsWith('note1')) {
    const d = nip19.decode(replyToEventId)
    if (d.type === 'note') replyToEventId = d.data as string
  }
  if (replyToPubkey?.startsWith('npub1')) {
    const d = nip19.decode(replyToPubkey)
    if (d.type === 'npub') replyToPubkey = d.data as string
  }
  const mentionPubkeys = ((args.mention_pubkeys as string[] | undefined) ?? []).map(mp => {
    if (mp.startsWith('npub1')) {
      const d = nip19.decode(mp)
      return d.type === 'npub' ? (d.data as string) : mp
    }
    return mp
  })
  const eventId = await sendNote(args.text as string, sk, pubkey, pool, replyToEventId, replyToPubkey, mentionPubkeys)
  return {
    content: [{
      type: 'text',
      text: `Published note. Event ID: ${eventId}\nnote1: ${nip19.noteEncode(eventId)}`,
    }],
  }
}
