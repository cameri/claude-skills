import { Database } from 'bun:sqlite'
import { mkdirSync } from 'fs'
import { STATE_DIR, DB_FILE } from './config.js'

export class EventCache {
  private db: InstanceType<typeof Database>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private stmtHasSeen: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private stmtInsertSeen: any

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
    this.stmtHasSeen = this.db.prepare<{ id: string }, [string]>(
      'SELECT id FROM seen_events WHERE id = ?',
    )
    this.stmtInsertSeen = this.db.prepare(
      'INSERT OR IGNORE INTO seen_events (id, kind, received_at) VALUES (?, ?, ?)',
    )
  }

  hasSeen(id: string): boolean {
    return this.stmtHasSeen.get(id) !== null
  }

  markSeen(id: string, kind: number): void {
    this.stmtInsertSeen.run(id, kind, Date.now())
  }

  close(): void {
    this.db.close()
  }
}
