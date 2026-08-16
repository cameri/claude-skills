/**
 * /sessions command support — pure functions, no side effects.
 *
 * Picks the most recent N Claude Code sessions and builds a plain-data menu
 * row layout for them: one button per session (`text` + `payload`), plus a
 * trailing Dismiss button. server.ts's `sessionsMenu` (a @grammyjs/menu
 * `Menu`) turns the returned rows into an actual dynamic inline keyboard via
 * `range.text({ text, payload }, handler)`, and reads `ctx.match` (the
 * pressed button's payload) back out to learn which session id — or the
 * 'dismiss'/'current' marker — was picked.
 */

const SNIPPET_MAX_LEN = 40

export function pickRecentSessions(
  entries: Array<{ id: string; mtimeMs: number; name?: string; firstMessageSnippet?: string }>,
  limit: number,
  nowMs: number,
  currentSessionId?: string | null,
): Array<{ id: string; displayLabel: string; relativeTime: string; isCurrent: boolean }> {
  return [...entries]
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, limit)
    .map(e => ({
      id: e.id,
      displayLabel: displayLabelFor(e),
      relativeTime: relativeTimeFor(e.mtimeMs, nowMs),
      isCurrent: Boolean(currentSessionId) && e.id === currentSessionId,
    }))
}

function displayLabelFor(e: { id: string; name?: string; firstMessageSnippet?: string }): string {
  if (e.name) return e.name
  if (e.firstMessageSnippet) {
    return e.firstMessageSnippet.length > SNIPPET_MAX_LEN
      ? e.firstMessageSnippet.slice(0, SNIPPET_MAX_LEN) + '…'
      : e.firstMessageSnippet
  }
  return e.id.slice(0, 8)
}

function relativeTimeFor(mtimeMs: number, nowMs: number): string {
  const diffMs = Math.max(0, nowMs - mtimeMs)
  const diffMin = diffMs / 60_000
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${Math.floor(diffMin)}m ago`
  const diffHour = diffMin / 60
  if (diffHour < 24) return `${Math.floor(diffHour)}h ago`
  const diffDay = diffHour / 24
  return `${Math.floor(diffDay)}d ago`
}

export const SESSIONS_MENU_ID = 'sessions'

const CALLBACK_DATA_MAX_BYTES = 64
// @grammyjs/menu auto-generates each button's callback_data as
// `${menuId}/${row}/${col}/${payload}/${hashType}${hash}`. With menu id
// 'sessions', a single-hex-digit row/col (this menu never exceeds 11 rows:
// up to 10 sessions + Dismiss), and a fixed 4-byte hash, the framing around
// the payload costs this many bytes — leaving the rest of the 64-byte cap
// for the payload itself.
const FRAMING_OVERHEAD_BYTES = Buffer.byteLength(`${SESSIONS_MENU_ID}/0/0//h0000`, 'utf8')
export const SESSION_PAYLOAD_MAX_BYTES = CALLBACK_DATA_MAX_BYTES - FRAMING_OVERHEAD_BYTES

const DISMISS_ROW = [{ text: 'Dismiss', payload: 'dismiss' }]

export function buildSessionsMenuRows(
  sessions: ReturnType<typeof pickRecentSessions>,
): Array<Array<{ text: string; payload: string }>> {
  const rows = sessions.map(s => {
    if (s.isCurrent) {
      const text = `${s.displayLabel} · ${s.relativeTime} (current)`
      return [{ text, payload: 'current' }]
    }
    const text = `${s.displayLabel} · ${s.relativeTime}`
    return [{ text, payload: truncatePayload(s.id) }]
  })
  rows.push(DISMISS_ROW)
  return rows
}

// A standard UUID (36 ASCII chars/bytes) fits comfortably under
// SESSION_PAYLOAD_MAX_BYTES, so no truncation is needed for standard UUID
// session ids. Guarded anyway: if a payload would exceed the budget,
// truncate it byte-by-byte until it fits. Simplest correct behavior — not
// attempting to preserve uniqueness beyond that.
export function truncatePayload(id: string): string {
  if (Buffer.byteLength(id, 'utf8') <= SESSION_PAYLOAD_MAX_BYTES) return id

  let truncated = id
  while (Buffer.byteLength(truncated, 'utf8') > SESSION_PAYLOAD_MAX_BYTES) {
    truncated = truncated.slice(0, -1)
  }
  return truncated
}
