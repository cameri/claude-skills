import * as nip04 from 'nostr-tools/nip04'
import * as nip17 from 'nostr-tools/nip17'
import * as nip19 from 'nostr-tools/nip19'
import { verifyEvent } from 'nostr-tools'
import { randomBytes } from 'crypto'
import type { NostrEventRaw, Ctx } from './types.js'
import { readAccess, writeAccess, pruneExpired } from './config.js'
import { sendDm, fetchEvent } from './publisher.js'

// Bug fix: call verifyEvent() on every inbound event, drop invalid
export function handleRelayMessage(relayUrl: string, raw: string, ctx: Ctx): void {
  let msg: unknown[]
  try {
    msg = JSON.parse(raw)
  } catch {
    return
  }
  if (!Array.isArray(msg)) return

  const type = msg[0]
  if (type === 'EVENT') {
    const event = msg[2] as Record<string, unknown>
    if (!event || typeof event !== 'object') return

    if (!verifyEvent(event as NostrEventRaw)) {
      process.stderr.write(`nostr: invalid event signature from ${relayUrl}, dropping\n`)
      return
    }

    const e = event as NostrEventRaw
    if (ctx.cache.hasSeen(e.id)) return
    ctx.cache.markSeen(e.id, e.kind)
    ctx.cache.store(e)
    handleNostrEvent(e, ctx).catch(err => {
      process.stderr.write(`nostr: handleNostrEvent error (kind:${e.kind} ${e.id}): ${err}\n`)
    })
  } else if (type === 'NOTICE') {
    process.stderr.write(`nostr [${relayUrl}] NOTICE: ${msg[1]}\n`)
  }
}

function notify(mcp: Ctx['mcp'], params: { content: string; meta: Record<string, unknown> }): void {
  mcp.notification({ method: 'notifications/claude/channel', params }).catch(err => {
    process.stderr.write(`nostr: notification failed: ${err}\n`)
  })
}

async function handleNostrEvent(event: NostrEventRaw, ctx: Ctx): Promise<void> {
  const { sk, pubkey, pool, mcp } = ctx
  process.stderr.write(`nostr: handling kind:${event.kind} ${event.id} from ${event.pubkey}\n`)

  // kind:9735 Zap Receipt — deliver directly, no access control
  if (event.kind === 9735) {
    const bolt11 = event.tags.find(t => t[0] === 'bolt11')?.[1] ?? null
    const eTag = event.tags.find(t => t[0] === 'e')?.[1] ?? null
    let amountMsats: number | null = null
    let senderPubkey: string | null = null
    let zapMessage = ''
    const descTag = event.tags.find(t => t[0] === 'description')
    if (descTag) {
      try {
        const zapRequest = JSON.parse(descTag[1]) as { pubkey?: string; content?: string; tags?: string[][] }
        senderPubkey = zapRequest.pubkey ?? null
        zapMessage = zapRequest.content ?? ''
        const amountTag = zapRequest.tags?.find(t => t[0] === 'amount')
        if (amountTag) amountMsats = parseInt(amountTag[1], 10)
      } catch {}
    }
    const amountSats = amountMsats !== null ? amountMsats / 1000 : null
    // Log zap message to console only — do not forward to Claude (prompt injection risk)
    if (zapMessage) {
      process.stderr.write(`nostr: zap message from ${senderPubkey ?? 'unknown'}: ${zapMessage}\n`)
    }
    notify(mcp, {
      content: `⚡ Zap: ${amountSats !== null ? amountSats + ' sats' : 'unknown amount'}`,
      meta: {
        source: 'nostr',
        kind: 9735,
        event_id: event.id,
        ts: new Date(event.created_at * 1000).toISOString(),
        sender_pubkey: senderPubkey,
        sender_npub: senderPubkey ? nip19.npubEncode(senderPubkey) : null,
        zapped_event_id: eTag,
        amount_msats: amountMsats,
        amount_sats: amountSats,
        bolt11,
      },
    })
    return
  }

  // kind:1059 NIP-17 gift wrap — unwrap and deliver
  if (event.kind === 1059) {
    let rumor: { pubkey: string; content: string; created_at: number }
    try {
      rumor = nip17.unwrapEvent(event as NostrEventRaw & { pubkey: string; sig: string }, sk) as typeof rumor
    } catch {
      process.stderr.write(`nostr: failed to unwrap NIP-17 gift wrap ${event.id}\n`)
      return
    }

    const senderPubkey = rumor.pubkey
    const access = readAccess()
    pruneExpired(access)

    if (access.allowFrom.includes(senderPubkey)) {
      notify(mcp, {
        content: rumor.content,
        meta: {
          source: 'nostr',
          pubkey: senderPubkey,
          npub: nip19.npubEncode(senderPubkey),
          event_id: event.id,
          kind: 1059,
          ts: new Date(rumor.created_at * 1000).toISOString(),
        },
      })
    }
    // NIP-17 doesn't do pairing — drop silently if not in allowlist
    return
  }

  // kind:0 Profile update — deliver if sender is in allowlist
  if (event.kind === 0) {
    const access = readAccess()
    if (!access.allowFrom.includes(event.pubkey)) return
    notify(mcp, {
      content: event.content,
      meta: {
        source: 'nostr',
        pubkey: event.pubkey,
        npub: nip19.npubEncode(event.pubkey),
        event_id: event.id,
        kind: 0,
        ts: new Date(event.created_at * 1000).toISOString(),
      },
    })
    return
  }

  // kind:7 NIP-25 Reaction — deliver only if sender is in allowlist and we are p-tagged
  if (event.kind === 7) {
    const pTags = event.tags.filter(t => t[0] === 'p').map(t => t[1])
    if (!pTags.includes(pubkey)) return
    const access = readAccess()
    if (!access.allowFrom.includes(event.pubkey)) return
    const reactedToEventId = event.tags.find(t => t[0] === 'e')?.[1] ?? null
    const reactedToKind = event.tags.find(t => t[0] === 'k')?.[1] ?? null
    notify(mcp, {
      content: event.content || '+',
      meta: {
        source: 'nostr',
        pubkey: event.pubkey,
        npub: nip19.npubEncode(event.pubkey),
        event_id: event.id,
        kind: 7,
        ts: new Date(event.created_at * 1000).toISOString(),
        reacted_to_event_id: reactedToEventId,
        reacted_to_kind: reactedToKind ? parseInt(reactedToKind, 10) : null,
      },
    })
    return
  }

  // kind:1 note from allowed sender, fetch thread ancestors
  if (event.kind === 1) {
    const access = readAccess()
    if (!access.allowFrom.includes(event.pubkey)) return
    const ancestors = await fetchThreadAncestors(event, ctx)
    notify(mcp, {
      content: event.content,
      meta: {
        source: 'nostr',
        pubkey: event.pubkey,
        npub: nip19.npubEncode(event.pubkey),
        event_id: event.id,
        note_id: nip19.noteEncode(event.id),
        kind: 1,
        ts: new Date(event.created_at * 1000).toISOString(),
        thread: ancestors.map(a => ({
          event_id: a.id,
          note_id: nip19.noteEncode(a.id),
          pubkey: a.pubkey,
          npub: nip19.npubEncode(a.pubkey),
          kind: a.kind,
          content: a.content,
          ts: new Date(a.created_at * 1000).toISOString(),
        })),
      },
    })
    return
  }

  // Non-DM kinds — emit as channel notification if sender is allowed
  if (event.kind !== 4) {
    const access = readAccess()
    if (!access.allowFrom.includes(event.pubkey)) return
    notify(mcp, {
      content: event.content,
      meta: {
        source: 'nostr',
        pubkey: event.pubkey,
        npub: nip19.npubEncode(event.pubkey),
        event_id: event.id,
        note_id: nip19.noteEncode(event.id),
        kind: event.kind,
        ts: new Date(event.created_at * 1000).toISOString(),
      },
    })
    return
  }

  // kind:4 DM — check it's addressed to us
  const recipientTag = event.tags.find(t => t[0] === 'p')
  if (!recipientTag || recipientTag[1] !== pubkey) return

  let plaintext: string
  try {
    plaintext = await nip04.decrypt(sk, event.pubkey, event.content)
  } catch {
    process.stderr.write(`nostr: failed to decrypt DM from ${event.pubkey}\n`)
    return
  }

  const access = readAccess()
  pruneExpired(access)

  // Allowed sender — deliver
  if (access.allowFrom.includes(event.pubkey)) {
    notify(mcp, {
      content: plaintext,
      meta: {
        source: 'nostr',
        pubkey: event.pubkey,
        npub: nip19.npubEncode(event.pubkey),
        event_id: event.id,
        kind: 4,
        ts: new Date(event.created_at * 1000).toISOString(),
      },
    })
    return
  }

  if (access.policy === 'disabled') return
  if (access.policy === 'allowlist') return

  // Pairing mode
  for (const [code, p] of Object.entries(access.pending)) {
    if (p.pubkey === event.pubkey) {
      if ((p.replies ?? 1) >= 2) return
      p.replies = (p.replies ?? 1) + 1
      writeAccess(access)
      await sendDm(
        event.pubkey,
        `Your pairing code is: ${code}\nAsk your assistant to run: /nostr:access pair ${code}`,
        sk, pubkey, pool,
      )
      return
    }
  }

  if (Object.keys(access.pending).length >= 3) return

  const code = randomBytes(3).toString('hex')
  const now = Date.now()
  access.pending[code] = {
    pubkey: event.pubkey,
    createdAt: now,
    expiresAt: now + 60 * 60 * 1000,
    replies: 1,
  }
  writeAccess(access)
  await sendDm(
    event.pubkey,
    `Pairing code: ${code}\nAsk your assistant to run: /nostr:access pair ${code}`,
    sk, pubkey, pool,
  )
}

async function fetchEventWithCache(id: string, ctx: Ctx): Promise<NostrEventRaw | null> {
  const cached = ctx.cache.get(id)
  if (cached) return cached
  try {
    const event = await fetchEvent({ ids: [id], limit: 1 }, ctx.pool, 5000)
    if (event) {
      ctx.cache.markSeen(event.id, event.kind)
      ctx.cache.store(event)
    }
    return event
  } catch {
    return null
  }
}

async function fetchThreadAncestors(event: NostrEventRaw, ctx: Ctx, maxDepth = 10): Promise<NostrEventRaw[]> {
  const ancestors: NostrEventRaw[] = []
  const visited = new Set<string>([event.id])
  let current = event

  for (let depth = 0; depth < maxDepth; depth++) {
    // NIP-10: prefer 'reply' marker, then 'root', then last e-tag, then first e-tag
    const eTags = current.tags.filter(t => t[0] === 'e')
    if (eTags.length === 0) break

    const replyTag = eTags.find(t => t[3] === 'reply')
    const rootTag = eTags.find(t => t[3] === 'root')
    const parentTag = replyTag ?? (eTags.length > 1 ? eTags[eTags.length - 1] : null) ?? rootTag ?? eTags[0]
    const parentId = parentTag[1]

    if (visited.has(parentId)) break
    visited.add(parentId)

    const parent = await fetchEventWithCache(parentId, ctx)
    if (!parent) break

    ancestors.unshift(parent)
    current = parent
  }

  return ancestors
}
