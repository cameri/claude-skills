import { readFileSync, writeFileSync, mkdirSync, renameSync, chmodSync } from 'fs'
import { join } from 'path'

export function credentialsPath(dir: string): string {
  return join(dir, '.env')
}

export function loadNsec(dir: string): string | null {
  try {
    const raw = readFileSync(credentialsPath(dir), 'utf8')
    const match = raw.match(/^REPLICATOR_NOSTR_NSEC=(\S+)/m)
    return match ? match[1] : null
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

export function saveNsec(dir: string, nsec: string): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  const path = credentialsPath(dir)
  const tmp = `${path}.tmp`
  writeFileSync(tmp, `REPLICATOR_NOSTR_NSEC=${nsec}\n`, { mode: 0o600 })
  renameSync(tmp, path)
  chmodSync(path, 0o600)
}
