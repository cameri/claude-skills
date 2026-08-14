/**
 * /sessions command support — pure functions, no side effects.
 *
 * Picks the most recent N Claude Code sessions and builds a plain-data
 * inline-keyboard layout for them. server.ts turns the returned array into
 * an actual grammy InlineKeyboard.
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

const CALLBACK_DATA_MAX_BYTES = 64
const CALLBACK_PREFIX = 'sess:'

const DISMISS_ROW = [{ text: 'Dismiss', callback_data: 'sess:dismiss' }]

export function buildSessionsKeyboard(
  sessions: ReturnType<typeof pickRecentSessions>,
): Array<Array<{ text: string; callback_data: string }>> {
  const rows = sessions.map(s => {
    if (s.isCurrent) {
      const text = `${s.displayLabel} · ${s.relativeTime} (current)`
      return [{ text, callback_data: 'sess:current' }]
    }
    const text = `${s.displayLabel} · ${s.relativeTime}`
    return [{ text, callback_data: buildCallbackData(s.id) }]
  })
  rows.push(DISMISS_ROW)
  return rows
}

// Telegram caps callback_data at 64 bytes. `sess:` (5 bytes) + a standard
// UUID (36 chars/bytes, ASCII) = 41 bytes — safely under the limit, so no
// truncation is needed for standard UUID ids. Guarded anyway: if a
// callback_data would exceed 64 bytes, truncate the id portion byte-by-byte
// until it fits. Simplest correct behavior — not attempting to preserve
// uniqueness beyond that.
function buildCallbackData(id: string): string {
  let data = CALLBACK_PREFIX + id
  if (Buffer.byteLength(data, 'utf8') <= CALLBACK_DATA_MAX_BYTES) return data

  let truncatedId = id
  while (Buffer.byteLength(CALLBACK_PREFIX + truncatedId, 'utf8') > CALLBACK_DATA_MAX_BYTES) {
    truncatedId = truncatedId.slice(0, -1)
  }
  return CALLBACK_PREFIX + truncatedId
}
