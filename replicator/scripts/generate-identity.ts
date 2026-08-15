#!/usr/bin/env bun
import { generateKeypair, keypairFromSecretKey, decodeNsec } from '../identity'
import { loadNsec, saveNsec, credentialsPath } from '../credentials'

const CREDENTIALS_DIR = process.env.REPLICATOR_CREDENTIALS_DIR
  ?? `${process.env.HOME}/.claude/channels/replicator`

function main(): void {
  const existing = loadNsec(CREDENTIALS_DIR)
  if (existing) {
    const kp = keypairFromSecretKey(decodeNsec(existing))
    console.log('Identity already exists — not regenerating (would orphan events already published under the old identity).')
    console.log(`npub: ${kp.npub}`)
    console.log(`pubkey (hex): ${kp.pubkeyHex}`)
    return
  }
  const kp = generateKeypair()
  saveNsec(CREDENTIALS_DIR, kp.nsec)
  console.log('Generated new replicator identity.')
  console.log(`npub: ${kp.npub}`)
  console.log(`pubkey (hex): ${kp.pubkeyHex}`)
  console.log(`Credentials stored at: ${credentialsPath(CREDENTIALS_DIR)}`)
}

main()
