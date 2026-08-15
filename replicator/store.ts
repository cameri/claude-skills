import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs'
import { join } from 'path'
import { emptyLedger, type Ledger } from './ledger'

export function ledgerPath(stateDir: string): string {
  return join(stateDir, 'ledger.json')
}

export function loadLedger(stateDir: string): Ledger {
  try {
    return JSON.parse(readFileSync(ledgerPath(stateDir), 'utf8')) as Ledger
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return emptyLedger()
    throw err
  }
}

export function saveLedger(stateDir: string, ledger: Ledger): void {
  mkdirSync(stateDir, { recursive: true })
  const path = ledgerPath(stateDir)
  const tmp = `${path}.tmp`
  writeFileSync(tmp, JSON.stringify(ledger, null, 2) + '\n')
  renameSync(tmp, path)
}
