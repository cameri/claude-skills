#!/usr/bin/env bun
import { loadLedger, saveLedger } from '../store'
import { recordPublish } from '../ledger'
import { selectChangedGenes } from '../publish-cycle'
import { buildGeneRecord, buildProfileRecord } from '../publisher'
import { buildLists } from '../lists'
import { NostrPublisher } from '../nostr-publisher'
import { loadNsec, credentialsPath } from '../credentials'
import { decodeNsec, keypairFromSecretKey, SPECIES_NAME } from '../identity'

const STATE_DIR = process.env.REPLICATOR_STATE_DIR ?? '/workspace/docs/replicator'
const CREDENTIALS_DIR = process.env.REPLICATOR_CREDENTIALS_DIR
  ?? `${process.env.HOME}/.claude/channels/replicator`
const RELAY_URLS = (process.env.REPLICATOR_NOSTR_RELAYS ?? 'wss://relay.damus.io,wss://offchain.pub')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

async function main(): Promise<void> {
  const nsec = loadNsec(CREDENTIALS_DIR)
  if (!nsec) {
    console.log(`no identity found at ${credentialsPath(CREDENTIALS_DIR)} — run scripts/generate-identity.ts once first`)
    process.exit(0)
  }

  const ledger = loadLedger(STATE_DIR)
  const changed = selectChangedGenes(ledger, ledger.cycles.lastPublish)
  if (changed.length === 0) {
    console.log('nothing changed since last publish')
    saveLedger(STATE_DIR, recordPublish(ledger, today()))
    return
  }

  const kp = keypairFromSecretKey(decodeNsec(nsec))
  const publisher = new NostrPublisher(kp.sk, kp.pubkeyHex, RELAY_URLS)
  const geneRecords = changed.map(key => buildGeneRecord(key, ledger.genes[key]))
  const listRecords = buildLists(ledger)
  const profileRecord = buildProfileRecord(SPECIES_NAME, ledger.harnessModels)
  const results = await publisher.publish([...geneRecords, ...listRecords, profileRecord])

  for (const r of results) {
    console.log(`${r.label}: ${r.ok ? 'ok' : `FAILED (${r.reason})`}`)
  }

  const anyFailed = results.some(r => !r.ok)
  if (anyFailed) {
    console.error('one or more records failed to publish — lastPublish not advanced, will retry next eligible cycle')
    process.exit(1)
  }

  saveLedger(STATE_DIR, recordPublish(ledger, today()))
}

main()
