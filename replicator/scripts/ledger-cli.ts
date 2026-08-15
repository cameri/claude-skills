#!/usr/bin/env bun
import { readFileSync } from 'fs'
import {
  registerGene,
  recordInvocation,
  applyEvent,
  markSeasonal,
  setCore,
  recordCycleRun,
  recordOutwardScan,
  setReportOnlyPruning,
  type GeneOrigin,
} from '../ledger'
import { loadLedger, saveLedger } from '../store'
import { classifyGene, pruneCandidates } from '../patterns'
import { parseSkillUsage } from '../extract'

const STATE_DIR = process.env.REPLICATOR_STATE_DIR ?? '/workspace/docs/replicator'

function nowISO(): string {
  return new Date().toISOString()
}

function today(): string {
  return nowISO().slice(0, 10)
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}

function main(): void {
  const [cmd, ...args] = process.argv.slice(2)
  let ledger = loadLedger(STATE_DIR)
  let output: unknown

  switch (cmd) {
    case 'seed': {
      const genesArg = flag(args, 'genes') ?? ''
      const coreArg = (flag(args, 'core') ?? '').split(',').filter(Boolean)
      for (const key of genesArg.split(',').filter(Boolean)) {
        ledger = registerGene(ledger, key, 'preexisting', nowISO(), { core: coreArg.includes(key) })
      }
      break
    }
    case 'register': {
      const key = flag(args, 'key')
      const origin = flag(args, 'origin') as GeneOrigin | undefined
      if (!key || !origin) throw new Error('register requires --key and --origin')
      ledger = registerGene(ledger, key, origin, nowISO(), { core: args.includes('--core') })
      break
    }
    case 'record': {
      const inputPath = flag(args, 'input')
      if (!inputPath) throw new Error('record requires --input <path>')
      const date = flag(args, 'date') ?? today()
      const counts = parseSkillUsage(readFileSync(inputPath, 'utf8'))
      for (const [key, count] of Object.entries(counts)) {
        if (!ledger.genes[key]) ledger = registerGene(ledger, key, 'preexisting', nowISO())
        ledger = recordInvocation(ledger, key, date, count)
      }
      break
    }
    case 'classify': {
      const date = flag(args, 'date') ?? today()
      const out: Record<string, string> = {}
      for (const [key, gene] of Object.entries(ledger.genes)) {
        if (gene.core) continue
        out[key] = classifyGene(gene, date)
      }
      output = out
      break
    }
    case 'prune': {
      const date = flag(args, 'date') ?? today()
      output = pruneCandidates(ledger, date)
      break
    }
    case 'mute': {
      const key = flag(args, 'key')
      if (!key) throw new Error('mute requires --key')
      ledger = applyEvent(ledger, key, nowISO(), 'muted', flag(args, 'reason') ?? '')
      break
    }
    case 'unmute': {
      const key = flag(args, 'key')
      if (!key) throw new Error('unmute requires --key')
      ledger = applyEvent(ledger, key, nowISO(), 'unmuted', flag(args, 'reason') ?? '')
      break
    }
    case 'propose-removal': {
      const key = flag(args, 'key')
      if (!key) throw new Error('propose-removal requires --key')
      ledger = applyEvent(ledger, key, nowISO(), 'removed-proposed', flag(args, 'reason') ?? '')
      break
    }
    case 'mark-seasonal': {
      const key = flag(args, 'key')
      if (!key) throw new Error('mark-seasonal requires --key')
      ledger = markSeasonal(ledger, key)
      break
    }
    case 'set-core': {
      const key = flag(args, 'key')
      if (!key) throw new Error('set-core requires --key')
      ledger = setCore(ledger, key)
      break
    }
    case 'record-cycle': {
      ledger = recordCycleRun(ledger, flag(args, 'date') ?? today())
      break
    }
    case 'record-outward-scan': {
      ledger = recordOutwardScan(ledger, flag(args, 'date') ?? today())
      break
    }
    case 'set-report-only': {
      ledger = setReportOnlyPruning(ledger, flag(args, 'value') === 'true')
      break
    }
    default:
      process.stderr.write(`unknown command: ${cmd}\n`)
      process.exit(1)
  }

  saveLedger(STATE_DIR, ledger)
  if (output !== undefined) console.log(JSON.stringify(output, null, 2))
  else console.log('ok')
}

main()
