import type { Ctx } from '../types.js'
import { readAccess, readConfig } from '../config.js'

export function handleStatus(ctx: Ctx): { content: { type: string; text: string }[] } {
  const { pubkey, npubSelf, pool, stats } = ctx
  const config = readConfig()
  const relayLines = Array.from(pool.relays.values()).map(c => {
    const age = c.lastConnected
      ? `last connected ${Math.round((Date.now() - c.lastConnected) / 1000)}s ago`
      : 'never connected'
    const err = c.lastError ? ` | error: ${c.lastError}` : ''
    return `  ${c.url}: ${c.state} | attempts: ${c.attempts} ok: ${c.successfulConns} fail: ${c.failedConns} | ${age}${err}`
  })
  const lines = [
    `Bot pubkey: ${pubkey}`,
    `Bot npub:   ${npubSelf}`,
    `Policy:     ${readAccess().policy}`,
    `Relays (${pool.relays.size}):`,
    ...relayLines,
    `Subscribed kinds: 4 (DMs)${config.subscribeKinds.length ? ', ' + config.subscribeKinds.join(', ') : ''}`,
    `Messages: sent=${stats.messages.sent} failed=${stats.messages.failed}`,
  ]
  return { content: [{ type: 'text', text: lines.join('\n') }] }
}
