import type { Server } from '@modelcontextprotocol/sdk/server/index.js'

export type PendingEntry = {
  pubkey: string
  createdAt: number
  expiresAt: number
  replies: number
}

export type Access = {
  policy: 'pairing' | 'allowlist' | 'disabled'
  allowFrom: string[]
  pending: Record<string, PendingEntry>
}

export type Config = {
  relays: string[]
  subscribeKinds: number[]
}

export type RelayEntry = {
  url: string
  marker?: 'read' | 'write'
}

export type RelayListCache = {
  relays: RelayEntry[]
  event_id: string
  created_at: number
  updatedAt: number
}

export type RelayState = 'connecting' | 'connected' | 'disconnected' | 'error'

export type RelayConn = {
  url: string
  ws: WebSocket | null
  state: RelayState
  attempts: number
  successfulConns: number
  failedConns: number
  lastConnected: number | null
  lastError: string | null
  backoffMs: number
  reconnectTimer: ReturnType<typeof setTimeout> | null
}

export type Stats = {
  messages: { sent: number; failed: number }
}

export interface NostrEventRaw {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}

// Structural interfaces to avoid circular imports
export interface IRelayPool {
  relays: Map<string, RelayConn>
  getConnected(): WebSocket[]
  connect(url: string): void
  disconnect(url: string): void
  connectAll(config: Config): void
}

export interface IEventCache {
  hasSeen(id: string): boolean
  markSeen(id: string, kind: number): void
  store(event: NostrEventRaw): void
  get(id: string): NostrEventRaw | null
  close(): void
}

export interface Ctx {
  sk: Uint8Array
  pubkey: string
  npubSelf: string
  pool: IRelayPool
  cache: IEventCache
  stats: Stats
  mcp: Server
}

export const MIN_BACKOFF = 1_000
export const MAX_BACKOFF = 60_000
export const CONTACT_RELAY_LIST_TTL_MS = 24 * 60 * 60 * 1000
