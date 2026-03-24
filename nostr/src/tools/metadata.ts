import { finalizeEvent, type UnsignedEvent } from 'nostr-tools'
import { mkdirSync, writeFileSync, renameSync } from 'fs'
import type { Ctx } from '../types.js'
import { publishToPool } from '../publisher.js'
import { STATE_DIR, PROFILE_FILE } from '../config.js'

// Bug fix: use atomic tmp+rename write for profile cache
export async function handleMetadata(
  args: Record<string, unknown>,
  ctx: Ctx,
): Promise<{ content: { type: string; text: string }[] }> {
  const { sk, pubkey, npubSelf, pool } = ctx
  const fields = ['name', 'display_name', 'about', 'picture', 'website', 'nip05', 'lud16']
  const meta: Record<string, string> = {}
  for (const f of fields) {
    if (typeof args[f] === 'string') meta[f] = args[f] as string
  }
  if (Object.keys(meta).length === 0) throw new Error('provide at least one metadata field')
  const unsigned: UnsignedEvent = {
    kind: 0,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: JSON.stringify(meta),
    pubkey,
  }
  const signed = finalizeEvent(unsigned, sk)
  await publishToPool(signed, pool)

  const profile = { pubkey, npub: npubSelf, ...meta, updatedAt: Date.now() }
  mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 })
  const tmp = PROFILE_FILE + '.tmp'
  writeFileSync(tmp, JSON.stringify(profile, null, 2) + '\n')
  renameSync(tmp, PROFILE_FILE)

  return {
    content: [{
      type: 'text',
      text: `Profile updated. Event ID: ${signed.id}\n${JSON.stringify(profile, null, 2)}`,
    }],
  }
}
