import { getPublicKey } from 'nostr-tools'
import * as nip19 from 'nostr-tools/nip19'
import { readFileSync, chmodSync } from 'fs'
import { ENV_FILE } from './config.js'

// Load env vars from state dir .env file
try {
  chmodSync(ENV_FILE, 0o600)
  for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^(\w+)=(.*)$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2]
  }
} catch {}

export function loadSecretKey(): Uint8Array {
  const nsecOrHex = process.env.NOSTR_NSEC ?? process.env.NOSTR_PRIVATE_KEY
  if (!nsecOrHex) {
    process.stderr.write(
      `nostr channel: NOSTR_NSEC required\n` +
        `  set in ${ENV_FILE}\n` +
        `  format: NOSTR_NSEC=nsec1...\n`,
    )
    process.exit(1)
  }
  if (nsecOrHex.startsWith('nsec1')) {
    const decoded = nip19.decode(nsecOrHex)
    if (decoded.type !== 'nsec') {
      process.stderr.write(`nostr channel: invalid nsec\n`)
      process.exit(1)
    }
    return decoded.data as Uint8Array
  }
  return Uint8Array.from(Buffer.from(nsecOrHex, 'hex'))
}

export const sk = loadSecretKey()
export const pubkey = getPublicKey(sk)
export const npubSelf = nip19.npubEncode(pubkey)
