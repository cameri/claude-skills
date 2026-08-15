import type { Ledger } from './ledger'

export function selectChangedGenes(ledger: Ledger, sinceISO: string | null): string[] {
  return Object.entries(ledger.genes)
    .filter(([, gene]) => gene.events.some(e => sinceISO === null || e.at > sinceISO))
    .map(([key]) => key)
}
