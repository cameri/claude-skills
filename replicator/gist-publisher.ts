import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { LIST_RECORD_KIND, type Publisher, type PublishRecord, type PublishResult } from './publisher'

export type GistFile = { content: string }

// A gist has no per-record addressing the way a Nostr replaceable event
// does — it's a handful of flat files, last-write-wins. Every gene goes
// into one genes.json keyed by label; lists drop their `a`-tag pointers
// (meaningless outside Nostr) down to a flat array of keys.
export function buildGistFiles(records: PublishRecord[]): Record<string, GistFile> {
  const files: Record<string, GistFile> = {}
  const genes: Record<string, unknown> = {}
  for (const record of records) {
    if (record.kind === 0) {
      files['profile.json'] = { content: record.content }
    } else if (record.kind === LIST_RECORD_KIND) {
      const keys = record.tags.filter(t => t[0] === 'g').map(t => t[1])
      files[`${record.label}.json`] = { content: JSON.stringify(keys, null, 2) }
    } else {
      genes[record.label] = JSON.parse(record.content)
    }
  }
  files['genes.json'] = { content: JSON.stringify(genes, null, 2) }
  return files
}

export function gistStatePath(stateDir: string): string {
  return join(stateDir, 'gist.json')
}

export function loadGistId(stateDir: string): string | null {
  try {
    const raw = JSON.parse(readFileSync(gistStatePath(stateDir), 'utf8')) as { id: string }
    return raw.id
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

export function saveGistId(stateDir: string, id: string, url: string): void {
  writeFileSync(gistStatePath(stateDir), JSON.stringify({ id, url }, null, 2) + '\n')
}

function runGh(args: string[], body: string): { ok: boolean; stdout: string; stderr: string } {
  const proc = Bun.spawnSync(['gh', ...args, '--input', '-'], { stdin: Buffer.from(body) })
  return { ok: proc.exitCode === 0, stdout: proc.stdout.toString(), stderr: proc.stderr.toString() }
}

export class GistPublisher implements Publisher {
  constructor(
    private stateDir: string,
    private description: string,
  ) {}

  // One gist, updated in place — a stable URL across cycles rather than a
  // new gist every week, mirroring the same "latest state at a stable
  // address" intent as the Nostr lists' replaceable events.
  async publish(records: PublishRecord[]): Promise<PublishResult[]> {
    const files = buildGistFiles(records)
    const gistId = loadGistId(this.stateDir)
    const result = gistId
      ? runGh(['api', `gists/${gistId}`, '--method', 'PATCH'], JSON.stringify({ files }))
      : runGh(['api', 'gists'], JSON.stringify({ description: this.description, public: true, files }))

    if (!result.ok) {
      return records.map(r => ({ label: r.label, ok: false, reason: result.stderr.trim() }))
    }
    if (!gistId) {
      const created = JSON.parse(result.stdout) as { id: string; html_url: string }
      saveGistId(this.stateDir, created.id, created.html_url)
    }
    return records.map(r => ({ label: r.label, ok: true }))
  }
}
