import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { emptyLedger, registerGene } from './ledger'
import { loadLedger, saveLedger, ledgerPath } from './store'

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'replicator-store-test-'))
}

describe('loadLedger', () => {
  test('returns an empty ledger when the file does not exist', () => {
    const dir = tmpDir()
    expect(loadLedger(dir)).toEqual(emptyLedger())
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('saveLedger / loadLedger round trip', () => {
  test('what is saved is what loads back', () => {
    const dir = tmpDir()
    const ledger = registerGene(emptyLedger(), 'foo:bar', 'inward', '2026-08-14T03:00:00Z', '2026-08-14')
    saveLedger(dir, ledger)
    expect(loadLedger(dir)).toEqual(ledger)
    rmSync(dir, { recursive: true, force: true })
  })

  test('creates the state directory if missing', () => {
    const dir = join(tmpDir(), 'nested', 'path')
    saveLedger(dir, emptyLedger())
    expect(loadLedger(dir)).toEqual(emptyLedger())
    rmSync(dir, { recursive: true, force: true })
  })

  test('a second save cleanly replaces the first — no leftover .tmp file', () => {
    const dir = tmpDir()
    saveLedger(dir, registerGene(emptyLedger(), 'a:a', 'inward', '2026-08-14T03:00:00Z', '2026-08-14'))
    saveLedger(dir, registerGene(emptyLedger(), 'b:b', 'inward', '2026-08-14T03:00:00Z', '2026-08-14'))
    const loaded = loadLedger(dir)
    expect(Object.keys(loaded.genes)).toEqual(['b:b'])
    const files = readdirSync(dir)
    expect(files.some(f => f.endsWith('.tmp'))).toBe(false)
    rmSync(dir, { recursive: true, force: true })
  })
})
