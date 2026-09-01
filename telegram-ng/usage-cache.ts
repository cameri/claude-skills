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
  omp?: {
    stats_at?: number
    overall?: {
      totalRequests?: number
      failedRequests?: number
      totalInputTokens?: number
      totalOutputTokens?: number
      totalCacheReadTokens?: number
      cacheRate?: number
      cacheSavings?: number
      totalCost?: number
      totalPremiumRequests?: number
    }
    byModel?: Array<{
      model?: string
      provider?: string
      totalRequests?: number
      totalCost?: number
      totalInputTokens?: number
      totalOutputTokens?: number
    }>
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
  // A past resets_at is never a fresh provider value (the Anthropic /usage
  // endpoint always returns the next reset, in the future) — it means the
  // bucket survived from an older report. Say so instead of "in 0m".
  if (resetsAt <= nowSeconds) return `resets ${timeStr} (stale)`
  return `resets ${timeStr} (in ${humanDelta(resetsAt - nowSeconds)})`
}

const RATE_LIMIT_KEYS = [
  ['five_hour', '5-hour limit'],
  ['seven_day', 'Weekly limit'],
] as const
/** $3.35 for ≥1, $0.449 below — compact, never trailing zeros. */
function formatMoney(cost: number): string {
  const digits = cost >= 1 ? 2 : 3
  return `$${cost.toFixed(cost >= 100 ? 0 : digits)}`
}

/** 9.1M / 1.1M / 914k — human token counts. */
function formatTokens(tokens: number): string {
  if (tokens >= 1e6) return `${(tokens / 1e6).toFixed(1)}M`
  if (tokens >= 1e3) return `${Math.round(tokens / 1e3)}k`
  return `${tokens}`
}

function formatOmpSection(omp: NonNullable<UsageCache['omp']>): string | null {
  const o = omp.overall ?? {}
  const lines: string[] = ['\u{1F916} omp usage']
  const head: string[] = []
  if (o.totalRequests != null) head.push(`${o.totalRequests} req`)
  if (o.totalCost != null) head.push(formatMoney(o.totalCost))
  if (o.cacheRate != null) head.push(`cache ${(o.cacheRate * 100).toFixed(0)}%`)
  if (head.length === 0) return null
  lines.push(head.join(' · '))
  const tokens: string[] = []
  if (o.totalInputTokens != null) tokens.push(`${formatTokens(o.totalInputTokens)} in`)
  if (o.totalOutputTokens != null) tokens.push(`${formatTokens(o.totalOutputTokens)} out`)
  if (o.totalCacheReadTokens != null) tokens.push(`${formatTokens(o.totalCacheReadTokens)} cached`)
  if (tokens.length > 0) lines.push(tokens.join(' · '))
  if (o.cacheSavings != null) lines.push(`~${(o.cacheSavings * 100).toFixed(0)}% saved by caching`)
  const byCost = (omp.byModel ?? [])
    .filter(m => m.model != null && m.totalCost != null)
    .sort((a, b) => (b.totalCost ?? 0) - (a.totalCost ?? 0))
    .slice(0, 3)
  if (byCost.length > 0) {
    lines.push('top models:')
    for (const m of byCost) {
      lines.push(`  ${m.model} · ${formatMoney(m.totalCost!)} (${m.totalRequests ?? 0} req)`)
    }
  }
  return lines.join('\n')
}

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
  const ompSection = cache.omp ? formatOmpSection(cache.omp) : null
  if (ompSection) {
    lines.push('')
    lines.push(ompSection)
  }

  return lines.join('\n').trimEnd()
}
