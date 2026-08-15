import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { isPublicSource, loadVisibilityMap, visibilityPath } from './repo-visibility'

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'replicator-repo-visibility-test-'))
}

describe('isPublicSource', () => {
  test('true when the gene key\'s plugin prefix has an entry marked public', () => {
    const map = { 'cameri-skills': { repo: 'cameri/skills', public: true, checkedAt: '2026-08-15' } }
    expect(isPublicSource(map, 'cameri-skills:replicator')).toBe(true)
  })

  test('false when the entry is marked private', () => {
    const map = { 'secret-plugin': { repo: 'cameri/private-repo', public: false, checkedAt: '2026-08-15' } }
    expect(isPublicSource(map, 'secret-plugin:do-thing')).toBe(false)
  })

  test('false (fail closed) when the plugin prefix has no entry at all', () => {
    expect(isPublicSource({}, 'built-in-skill:action')).toBe(false)
  })

  test('derives the plugin prefix from everything before the first colon', () => {
    const map = { slash: { repo: 'n/a', public: true, checkedAt: '2026-08-15' } }
    expect(isPublicSource(map, 'slash:clear')).toBe(true)
  })
})

describe('loadVisibilityMap', () => {
  test('returns an empty map when the file does not exist — fail closed, nothing publishes', () => {
    const dir = tmpDir()
    expect(loadVisibilityMap(dir)).toEqual({})
    rmSync(dir, { recursive: true, force: true })
  })

  test('loads what was written to disk', () => {
    const dir = tmpDir()
    const map = { 'cameri-skills': { repo: 'cameri/skills', public: true, checkedAt: '2026-08-15' } }
    writeFileSync(visibilityPath(dir), JSON.stringify(map))
    expect(loadVisibilityMap(dir)).toEqual(map)
    rmSync(dir, { recursive: true, force: true })
  })
})
