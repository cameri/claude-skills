#!/usr/bin/env bun
import { loadLedger, saveLedger } from '../store'
import { recordPublish } from '../ledger'
import { selectChangedGenes, buildPublishPlan } from '../publish-cycle'
import { NostrPublisher } from '../nostr-publisher'
import { loadNsec, credentialsPath } from '../credentials'
import { decodeNsec, keypairFromSecretKey, SPECIES_NAME } from '../identity'
import { loadVisibilityMap, visibilityPath, isPublicSource } from '../repo-visibility'

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

// Prints exactly what a real publish would send, without ever constructing a
// NostrPublisher (no network call) or mutating the ledger (no
// saveLedger/recordPublish) — a preview a human can read before ever
// committing to an irreversible public Nostr publish.
function printDryRun(plan: ReturnType<typeof buildPublishPlan>): void {
  for (const record of plan) {
    const dTag = record.dTag !== undefined ? `, d=${record.dTag}` : ''
    console.log(`${record.label} — kind ${record.kind}${dTag}, ${record.tags.length} tags`)
    console.log(record.content)
    console.log('---')
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')
  const ledger = loadLedger(STATE_DIR)
  const nsec = loadNsec(CREDENTIALS_DIR)
  const visibility = loadVisibilityMap(STATE_DIR)
  const excludedCount = Object.keys(ledger.genes).filter(key => !isPublicSource(visibility, key)).length
  if (excludedCount > 0) {
    console.log(`${excludedCount} gene(s) excluded — plugin not confirmed public in ${visibilityPath(STATE_DIR)} (run scripts/check-repo-visibility.ts to refresh)`)
  }

  if (dryRun) {
    // buildPublishPlan is pure — no identity or network is actually
    // required to preview it. Fall back to a placeholder pubkey when no
    // identity has been generated yet so the preview still works.
    const pubkeyHex = nsec ? keypairFromSecretKey(decodeNsec(nsec)).pubkeyHex : '0'.repeat(64)
    if (!nsec) {
      console.log(`no identity found at ${credentialsPath(CREDENTIALS_DIR)} — using a placeholder pubkey for this dry run`)
    }
    printDryRun(buildPublishPlan(ledger, SPECIES_NAME, pubkeyHex, visibility))
    return
  }

  if (!nsec) {
    console.log(`no identity found at ${credentialsPath(CREDENTIALS_DIR)} — run scripts/generate-identity.ts once first`)
    process.exit(0)
  }

  const changed = selectChangedGenes(ledger, ledger.cycles.lastPublish)
  if (changed.length === 0) {
    console.log('nothing changed since last publish')
    saveLedger(STATE_DIR, recordPublish(ledger, today()))
    return
  }

  const kp = keypairFromSecretKey(decodeNsec(nsec))
  const publisher = new NostrPublisher(kp.sk, kp.pubkeyHex, RELAY_URLS)
  const plan = buildPublishPlan(ledger, SPECIES_NAME, kp.pubkeyHex, visibility)
  let results
  try {
    results = await publisher.publish(plan)
  } finally {
    publisher.close()
  }

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
