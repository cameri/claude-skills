import { generateSecretKey, getPublicKey } from 'nostr-tools'
import * as nip19 from 'nostr-tools/nip19'

export const GENUS = 'Replicator'
export const EPITHET = 'deus'
export const SPECIES_NAME = `${GENUS} ${EPITHET}`

export type Keypair = {
  sk: Uint8Array
  nsec: string
  npub: string
  pubkeyHex: string
}

export function keypairFromSecretKey(sk: Uint8Array): Keypair {
  const pubkeyHex = getPublicKey(sk)
  return {
    sk,
    nsec: nip19.nsecEncode(sk),
    npub: nip19.npubEncode(pubkeyHex),
    pubkeyHex,
  }
}

export function generateKeypair(): Keypair {
  return keypairFromSecretKey(generateSecretKey())
}

export function decodeNsec(nsec: string): Uint8Array {
  const decoded = nip19.decode(nsec)
  if (decoded.type !== 'nsec') throw new Error(`not an nsec: ${nsec}`)
  return decoded.data as Uint8Array
}
