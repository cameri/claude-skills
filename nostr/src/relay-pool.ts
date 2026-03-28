import { randomBytes } from 'crypto'
import type { RelayConn, Config } from './types.js'
import { MIN_BACKOFF, MAX_BACKOFF } from './types.js'
import { readConfig, readAccess } from './config.js'
import { pubkey } from './identity.js'

export class RelayPool {
  public relays = new Map<string, RelayConn>()
  private subscriptionId = `claude-${randomBytes(4).toString('hex')}`
  private onMessage: (url: string, raw: string) => void

  constructor(onMessage: (url: string, raw: string) => void) {
    this.onMessage = onMessage
  }

  getConnected(): WebSocket[] {
    return Array.from(this.relays.values())
      .filter(c => c.state === 'connected' && c.ws)
      .map(c => c.ws!)
  }

  connect(url: string): void {
    let conn = this.relays.get(url)
    if (!conn) {
      conn = {
        url,
        ws: null,
        state: 'disconnected',
        attempts: 0,
        successfulConns: 0,
        failedConns: 0,
        lastConnected: null,
        lastError: null,
        backoffMs: MIN_BACKOFF,
        reconnectTimer: null,
      }
      this.relays.set(url, conn)
    }

    if (conn.state === 'connecting' || conn.state === 'connected') return
    if (conn.reconnectTimer) {
      clearTimeout(conn.reconnectTimer)
      conn.reconnectTimer = null
    }

    conn.state = 'connecting'
    conn.attempts++

    let ws: WebSocket
    try {
      ws = new WebSocket(url)
    } catch (e) {
      conn.state = 'error'
      conn.lastError = String(e)
      conn.failedConns++
      this.scheduleReconnect(conn)
      return
    }

    conn.ws = ws

    ws.onopen = () => {
      conn!.state = 'connected'
      conn!.successfulConns++
      conn!.lastConnected = Date.now()
      conn!.backoffMs = MIN_BACKOFF
      process.stderr.write(`nostr: connected to ${url}\n`)
      this.sendSubscription(ws)
    }

    ws.onmessage = (ev: MessageEvent) => {
      this.onMessage(url, ev.data as string)
    }

    ws.onerror = () => {
      conn!.lastError = 'WebSocket error'
      process.stderr.write(`nostr: error on ${url}\n`)
    }

    // Bug fix: remove dead branch — both paths were identical (failedConns++)
    ws.onclose = () => {
      conn!.failedConns++
      conn!.state = 'disconnected'
      conn!.ws = null
      process.stderr.write(`nostr: disconnected from ${url}, reconnecting...\n`)
      this.scheduleReconnect(conn!)
    }
  }

  scheduleReconnect(conn: RelayConn): void {
    if (conn.reconnectTimer) return
    const delay = conn.backoffMs
    conn.backoffMs = Math.min(conn.backoffMs * 2, MAX_BACKOFF)
    conn.reconnectTimer = setTimeout(() => {
      conn.reconnectTimer = null
      this.connect(conn.url)
    }, delay)
  }

  // Bug fix: remove unused `kinds` and `filter` variables
  private sendSubscription(ws: WebSocket): void {
    const config = readConfig()
    const access = readAccess()
    const extraKinds = config.subscribeKinds.filter(k => k !== 4)

    ws.send(JSON.stringify(['REQ', this.subscriptionId, { kinds: [4, 1059], '#p': [pubkey], limit: 0 }]))
    ws.send(JSON.stringify(['REQ', `${this.subscriptionId}-zaps`, { kinds: [9735], '#p': [pubkey], limit: 0 }]))
    ws.send(JSON.stringify(['REQ', `${this.subscriptionId}-reactions`, { kinds: [7], '#p': [pubkey], limit: 0 }]))
    ws.send(JSON.stringify(['REQ', `${this.subscriptionId}-mentions`, { kinds: [1], '#p': [pubkey], limit: 0 }]))

    if (access.allowFrom.length > 0) {
      ws.send(JSON.stringify(['REQ', `${this.subscriptionId}-allowlist`, { kinds: [0, 1], authors: access.allowFrom, limit: 0 }]))
    }

    if (extraKinds.length > 0) {
      ws.send(JSON.stringify(['REQ', `${this.subscriptionId}-extra`, { kinds: extraKinds, limit: 0 }]))
    }
  }

  disconnect(url: string): void {
    const conn = this.relays.get(url)
    if (!conn) return
    if (conn.reconnectTimer) {
      clearTimeout(conn.reconnectTimer)
      conn.reconnectTimer = null
    }
    if (conn.ws) {
      conn.ws.onclose = null
      conn.ws.close()
      conn.ws = null
    }
    this.relays.delete(url)
  }

  connectAll(config: Config): void {
    for (const url of this.relays.keys()) {
      if (!config.relays.includes(url)) this.disconnect(url)
    }
    for (const url of config.relays) {
      this.connect(url)
    }
  }
}
