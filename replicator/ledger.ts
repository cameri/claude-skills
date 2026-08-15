export type GeneOrigin = 'inward' | 'outward-speculative' | 'adopted' | 'preexisting'
export type GeneState = 'active' | 'muted'
export type EventType = 'born' | 'muted' | 'unmuted' | 'removed-proposed' | 'removed'

export type GeneEvent = {
  at: string
  type: EventType
  reason: string
}

export type Gene = {
  origin: GeneOrigin
  born: string
  seasonal: boolean
  core: boolean
  muteThresholdWeeks: number
  state: GeneState
  events: GeneEvent[]
  invocations: Record<string, number>
}

export type Cycles = {
  lastRun: string | null
  lastOutwardScan: string | null
  count: number
  reportOnlyPruning: boolean
}

export type Ledger = {
  genes: Record<string, Gene>
  cycles: Cycles
}

export const DEFAULT_MUTE_THRESHOLD_WEEKS = 8

export function emptyLedger(): Ledger {
  return {
    genes: {},
    cycles: { lastRun: null, lastOutwardScan: null, count: 0, reportOnlyPruning: true },
  }
}

export function registerGene(
  ledger: Ledger,
  key: string,
  origin: GeneOrigin,
  atISO: string,
  opts: { core?: boolean } = {},
): Ledger {
  if (ledger.genes[key]) return ledger
  const gene: Gene = {
    origin,
    born: atISO.slice(0, 10),
    seasonal: false,
    core: opts.core ?? false,
    muteThresholdWeeks: DEFAULT_MUTE_THRESHOLD_WEEKS,
    state: 'active',
    events: [{ at: atISO, type: 'born', reason: `origin=${origin}` }],
    invocations: {},
  }
  return { ...ledger, genes: { ...ledger.genes, [key]: gene } }
}

export function recordInvocation(ledger: Ledger, key: string, dateISO: string, count: number): Ledger {
  const gene = ledger.genes[key]
  if (!gene) throw new Error(`unknown gene: ${key}`)
  const invocations = { ...gene.invocations, [dateISO]: (gene.invocations[dateISO] ?? 0) + count }
  return { ...ledger, genes: { ...ledger.genes, [key]: { ...gene, invocations } } }
}

export function applyEvent(ledger: Ledger, key: string, atISO: string, type: EventType, reason: string): Ledger {
  const gene = ledger.genes[key]
  if (!gene) throw new Error(`unknown gene: ${key}`)
  const state: GeneState = type === 'muted' ? 'muted' : type === 'unmuted' ? 'active' : gene.state
  const events = [...gene.events, { at: atISO, type, reason }]
  return { ...ledger, genes: { ...ledger.genes, [key]: { ...gene, state, events } } }
}

export function markSeasonal(ledger: Ledger, key: string): Ledger {
  const gene = ledger.genes[key]
  if (!gene) throw new Error(`unknown gene: ${key}`)
  return { ...ledger, genes: { ...ledger.genes, [key]: { ...gene, seasonal: true } } }
}

export function setCore(ledger: Ledger, key: string): Ledger {
  const gene = ledger.genes[key]
  if (!gene) throw new Error(`unknown gene: ${key}`)
  return { ...ledger, genes: { ...ledger.genes, [key]: { ...gene, core: true } } }
}

export function recordCycleRun(ledger: Ledger, dateISO: string): Ledger {
  return { ...ledger, cycles: { ...ledger.cycles, lastRun: dateISO, count: ledger.cycles.count + 1 } }
}

export function recordOutwardScan(ledger: Ledger, dateISO: string): Ledger {
  return { ...ledger, cycles: { ...ledger.cycles, lastOutwardScan: dateISO } }
}

export function setReportOnlyPruning(ledger: Ledger, value: boolean): Ledger {
  return { ...ledger, cycles: { ...ledger.cycles, reportOnlyPruning: value } }
}
