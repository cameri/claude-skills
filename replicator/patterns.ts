import type { Ledger, Gene } from './ledger'

export type Pattern = 'flapping' | 'seasonal-candidate' | 'decaying' | 'revived' | 'stable'

const DAY_MS = 24 * 60 * 60 * 1000

function invocationDates(gene: Gene): string[] {
  return Object.keys(gene.invocations)
    .filter(d => gene.invocations[d] > 0)
    .sort()
}

export function weeksIdle(gene: Gene, todayISO: string): number {
  const dates = invocationDates(gene)
  const last = dates.length > 0 ? dates.at(-1)! : gene.born
  return Math.floor((Date.parse(todayISO) - Date.parse(last)) / DAY_MS / 7)
}

export function isFlapping(gene: Gene, lookback = 4): boolean {
  const toggles = gene.events.filter(e => e.type === 'muted' || e.type === 'unmuted')
  if (toggles.length < lookback) return false
  const recent = toggles.slice(-lookback)
  for (let i = 1; i < recent.length; i++) {
    if (recent[i].type === recent[i - 1].type) return false
  }
  return true
}

export function isRevived(gene: Gene, thresholdWeeks: number): boolean {
  const lastMute = [...gene.events].reverse().find(e => e.type === 'muted')
  if (!lastMute) return false
  const after = invocationDates(gene).filter(d => Date.parse(d) > Date.parse(lastMute.at))
  if (after.length === 0) return false
  const gapWeeks = (Date.parse(after[0]) - Date.parse(lastMute.at)) / DAY_MS / 7
  return gapWeeks >= thresholdWeeks
}

export function hasSeasonalGapPattern(gene: Gene, thresholdWeeks: number): boolean {
  const dates = invocationDates(gene)
  for (let i = 1; i < dates.length; i++) {
    const gapWeeks = (Date.parse(dates[i]) - Date.parse(dates[i - 1])) / DAY_MS / 7
    if (gapWeeks >= thresholdWeeks) return true
  }
  return false
}

export function classifyGene(gene: Gene, todayISO: string): Pattern {
  // Only consider flapping if there are no invocations (purely from automation)
  const invocations = invocationDates(gene)
  if (isFlapping(gene) && invocations.length === 0) return 'flapping'
  if (isRevived(gene, gene.muteThresholdWeeks)) return 'revived'
  const idle = weeksIdle(gene, todayISO)
  if (idle >= gene.muteThresholdWeeks) {
    if (hasSeasonalGapPattern(gene, gene.muteThresholdWeeks)) return 'seasonal-candidate'
    return 'decaying'
  }
  return 'stable'
}

export type PruneResult = {
  toMute: string[]
  flagSeasonal: string[]
  removalCandidates: string[]
}

export function pruneCandidates(ledger: Ledger, todayISO: string): PruneResult {
  const toMute: string[] = []
  const flagSeasonal: string[] = []
  const removalCandidates: string[] = []
  for (const [key, gene] of Object.entries(ledger.genes)) {
    if (gene.core || gene.state === 'muted' || gene.seasonal) continue
    const pattern = classifyGene(gene, todayISO)
    if (pattern === 'seasonal-candidate') {
      flagSeasonal.push(key)
      continue
    }
    if (pattern === 'decaying') {
      toMute.push(key)
      const priorDecayMutes = gene.events.filter(e => e.type === 'muted' && e.reason === 'decay').length
      if (priorDecayMutes >= 2) removalCandidates.push(key)
    }
  }
  return { toMute, flagSeasonal, removalCandidates }
}
