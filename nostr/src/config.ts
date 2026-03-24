import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import type { Access, Config, RelayListCache } from './types.js'

export const STATE_DIR =
  process.env.NOSTR_STATE_DIR ?? join(homedir(), '.claude', 'channels', 'nostr')
export const ACCESS_FILE = join(STATE_DIR, 'access.json')
export const CONFIG_FILE = join(STATE_DIR, 'config.json')
export const ENV_FILE = join(STATE_DIR, '.env')
export const PROFILE_FILE = join(STATE_DIR, 'profile.json')
export const RELAY_LIST_FILE = join(STATE_DIR, 'relay-list.json')
export const CONTACTS_DIR = join(STATE_DIR, 'contacts')
export const DB_FILE = join(STATE_DIR, 'events.db')

export function defaultAccess(): Access {
  return { policy: 'pairing', allowFrom: [], pending: {} }
}

export function defaultConfig(): Config {
  return {
    relays: ['wss://relay.damus.io', 'wss://offchain.pub'],
    subscribeKinds: [],
  }
}

export function readAccess(): Access {
  try {
    const raw = readFileSync(ACCESS_FILE, 'utf8')
    const p = JSON.parse(raw) as Partial<Access>
    return {
      policy: p.policy ?? 'pairing',
      allowFrom: p.allowFrom ?? [],
      pending: p.pending ?? {},
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return defaultAccess()
    process.stderr.write(`nostr channel: access.json corrupt, starting fresh\n`)
    return defaultAccess()
  }
}

export function writeAccess(a: Access): void {
  mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 })
  const tmp = ACCESS_FILE + '.tmp'
  writeFileSync(tmp, JSON.stringify(a, null, 2) + '\n', { mode: 0o600 })
  renameSync(tmp, ACCESS_FILE)
}

export function readConfig(): Config {
  try {
    const raw = readFileSync(CONFIG_FILE, 'utf8')
    const p = JSON.parse(raw) as Partial<Config>
    return {
      relays: p.relays ?? defaultConfig().relays,
      subscribeKinds: p.subscribeKinds ?? [],
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return defaultConfig()
    return defaultConfig()
  }
}

export function writeConfig(c: Config): void {
  mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 })
  const tmp = CONFIG_FILE + '.tmp'
  writeFileSync(tmp, JSON.stringify(c, null, 2) + '\n')
  renameSync(tmp, CONFIG_FILE)
}

export function readRelayList(): RelayListCache | null {
  try {
    return JSON.parse(readFileSync(RELAY_LIST_FILE, 'utf8')) as RelayListCache
  } catch {
    return null
  }
}

export function writeRelayList(cache: RelayListCache): void {
  mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 })
  const tmp = RELAY_LIST_FILE + '.tmp'
  writeFileSync(tmp, JSON.stringify(cache, null, 2) + '\n')
  renameSync(tmp, RELAY_LIST_FILE)
}

export function readContactRelayList(contactPubkey: string): RelayListCache | null {
  try {
    return JSON.parse(
      readFileSync(join(CONTACTS_DIR, `${contactPubkey}.json`), 'utf8'),
    ) as RelayListCache
  } catch {
    return null
  }
}

export function writeContactRelayList(contactPubkey: string, cache: RelayListCache): void {
  mkdirSync(CONTACTS_DIR, { recursive: true, mode: 0o700 })
  const file = join(CONTACTS_DIR, `${contactPubkey}.json`)
  const tmp = file + '.tmp'
  writeFileSync(tmp, JSON.stringify(cache, null, 2) + '\n')
  renameSync(tmp, file)
}

export function pruneExpired(a: Access): boolean {
  const now = Date.now()
  let changed = false
  for (const [code, p] of Object.entries(a.pending)) {
    if (p.expiresAt < now) {
      delete a.pending[code]
      changed = true
    }
  }
  return changed
}
