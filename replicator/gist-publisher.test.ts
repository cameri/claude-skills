import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { buildGistFiles, gistStatePath, loadGistId, saveGistId } from './gist-publisher'
import { GENE_RECORD_KIND, LIST_RECORD_KIND, type PublishRecord } from './publisher'

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'replicator-gist-test-'))
}

describe('buildGistFiles', () => {
  test('one gene record becomes one entry in genes.json, keyed by label', () => {
    const records: PublishRecord[] = [
      { label: 'foo:bar', kind: GENE_RECORD_KIND, dTag: 'foo:bar', content: '{"origin":"inward","state":"active"}', tags: [] },
    ]
    const files = buildGistFiles(records)
    expect(JSON.parse(files['genes.json'].content)).toEqual({ 'foo:bar': { origin: 'inward', state: 'active' } })
  })

  test('core and active list records become their own flat JSON array files, dropping the a-tag pointers', () => {
    const records: PublishRecord[] = [
      { label: 'core', kind: LIST_RECORD_KIND, dTag: 'core', content: '', tags: [['g', 'a:a'], ['a', `${GENE_RECORD_KIND}:pubkey:a:a`]] },
      { label: 'active', kind: LIST_RECORD_KIND, dTag: 'active', content: '', tags: [['g', 'a:a'], ['g', 'b:b']] },
    ]
    const files = buildGistFiles(records)
    expect(JSON.parse(files['core.json'].content)).toEqual(['a:a'])
    expect(JSON.parse(files['active.json'].content)).toEqual(['a:a', 'b:b'])
  })

  test('the profile record becomes profile.json verbatim', () => {
    const records: PublishRecord[] = [{ label: 'profile', kind: 0, content: '{"name":"Replicator deus"}', tags: [] }]
    const files = buildGistFiles(records)
    expect(JSON.parse(files['profile.json'].content)).toEqual({ name: 'Replicator deus' })
  })

  test('genes.json is present (possibly empty) even with zero gene records', () => {
    const records: PublishRecord[] = [
      { label: 'core', kind: LIST_RECORD_KIND, dTag: 'core', content: '', tags: [] },
      { label: 'active', kind: LIST_RECORD_KIND, dTag: 'active', content: '', tags: [] },
      { label: 'profile', kind: 0, content: '{}', tags: [] },
    ]
    const files = buildGistFiles(records)
    expect(JSON.parse(files['genes.json'].content)).toEqual({})
  })
})

describe('loadGistId / saveGistId', () => {
  test('returns null when no gist has been created yet', () => {
    const dir = tmpDir()
    expect(loadGistId(dir)).toBeNull()
    rmSync(dir, { recursive: true, force: true })
  })

  test('round-trips what was saved', () => {
    const dir = tmpDir()
    saveGistId(dir, 'abc123', 'https://gist.github.com/phoenix-server/abc123')
    expect(loadGistId(dir)).toBe('abc123')
    rmSync(dir, { recursive: true, force: true })
  })

  test('loads a gist id written directly to disk', () => {
    const dir = tmpDir()
    writeFileSync(gistStatePath(dir), JSON.stringify({ id: 'xyz', url: 'https://gist.github.com/x/xyz' }))
    expect(loadGistId(dir)).toBe('xyz')
    rmSync(dir, { recursive: true, force: true })
  })
})
