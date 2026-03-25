import { Database } from 'bun:sqlite'
import { mkdirSync } from 'fs'
import { STATE_DIR, DB_FILE } from './config.js'
import type { NostrEventRaw } from './types.js'

export class EventCache {
  private db: InstanceType<typeof Database>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private stmtHasSeen: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private stmtInsertSeen: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private stmtStoreEvent: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private stmtGetEvent: any

  constructor(dbFile: string = DB_FILE) {
    mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 })
    this.db = new Database(dbFile)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS seen_events (
        id TEXT PRIMARY KEY,
        kind INTEGER NOT NULL,
        received_at INTEGER NOT NULL
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_received_at ON seen_events (received_at)`)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        json TEXT NOT NULL,
        received_at INTEGER NOT NULL
      )
    `)
    this.stmtHasSeen = this.db.prepare<{ id: string }, [string]>(
      'SELECT id FROM seen_events WHERE id = ?',
    )
    this.stmtInsertSeen = this.db.prepare(
      'INSERT OR IGNORE INTO seen_events (id, kind, received_at) VALUES (?, ?, ?)',
    )
    this.stmtStoreEvent = this.db.prepare(
      'INSERT OR IGNORE INTO events (id, json, received_at) VALUES (?, ?, ?)',
    )
    this.stmtGetEvent = this.db.prepare<{ json: string }, [string]>(
      'SELECT json FROM events WHERE id = ?',
    )
  }

  hasSeen(id: string): boolean {
    return this.stmtHasSeen.get(id) !== null
  }

  markSeen(id: string, kind: number): void {
    this.stmtInsertSeen.run(id, kind, Date.now())
  }

  store(event: NostrEventRaw): void {
    this.stmtStoreEvent.run(event.id, JSON.stringify(event), Date.now())
  }

  get(id: string): NostrEventRaw | null {
    const row = this.stmtGetEvent.get(id) as { json: string } | null
    if (!row) return null
    try {
      return JSON.parse(row.json) as NostrEventRaw
    } catch {
      return null
    }
  }

  close(): void {
    this.db.close()
  }
}
