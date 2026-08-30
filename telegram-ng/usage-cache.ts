/**
 * /usage command support — pure formatting, no side effects.
 *
 * Reads the same cache file statusline-wrapper.py writes on every statusline
 * render and usage-alert.py's Stop hook polls for threshold-crossing pushes
 * (~/.claude/session-status-cache.json; under omp, sandbox-manager's
 * usage-state extension writes it after every turn). This is the on-demand
 * pull counterpart: no band/threshold state, just "what does the cache say
 * right now" — server.ts wires this to the /usage bot command.
 */

export type UsageCache = {
  cached_at?: number
  session_id?: string | null
  context_window?: {
    used_percentage?: number | null
    total_input_tokens?: number | null
    context_window_size?: number | null
  }
  rate_limits?: {
    five_hour?: { used_percentage?: number | null; resets_at?: number | null }
    seven_day?: { used_percentage?: number | null; resets_at?: number | null }
  }
}

export const DEFAULT_MAX_CACHE_AGE_SECONDS = 3600

function humanDelta(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  if (days >= 1) return `${days}d ${hours}h`
  if (hours >= 1) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function formatReset(resetsAt: number | null | undefined, nowSeconds: number): string | null {
  if (resetsAt === null || resetsAt === undefined) return null
  const timeStr =
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Toronto',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(resetsAt * 1000)) + ' ET'
  return `resets ${timeStr} (in ${humanDelta(resetsAt - nowSeconds)})`
}

const RATE_LIMIT_KEYS = [
  ['five_hour', '5-hour limit'],
  ['seven_day', 'Weekly limit'],
] as const

export function formatUsageMessage(
  cache: UsageCache | null,
  nowSeconds: number,
  maxCacheAgeSeconds: number = DEFAULT_MAX_CACHE_AGE_SECONDS,
): string {
  if (!cache) {
    return "No usage data cached yet — run a turn first so the cache writer fills it in (statusline hook on Claude Code, usage-state extension on omp)."
  }

  const lines: string[] = ['\u{1F4CA} Usage']
  if (cache.cached_at !== undefined) {
    const age = nowSeconds - cache.cached_at
    if (age > maxCacheAgeSeconds) {
      lines.push(`⚠️ cached ${humanDelta(age)} ago — may be stale`)
    }
  }
  lines.push('')

  const cw = cache.context_window ?? {}
  if (cw.used_percentage != null) {
    let tokStr = ''
    if (cw.total_input_tokens != null && cw.context_window_size) {
      tokStr = ` (~${Math.round(cw.total_input_tokens / 1000)}k/${Math.round(cw.context_window_size / 1000)}k tokens)`
    }
    lines.push(`Context: ${cw.used_percentage.toFixed(0)}% used${tokStr}`)
    lines.push('')
  }

  const rl = cache.rate_limits ?? {}
  for (const [key, label] of RATE_LIMIT_KEYS) {
    const bucket = rl[key] ?? {}
    if (bucket.used_percentage == null) continue
    lines.push(`${label}: ${bucket.used_percentage.toFixed(0)}% used`)
    const reset = formatReset(bucket.resets_at, nowSeconds)
    if (reset) lines.push(reset)
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}
