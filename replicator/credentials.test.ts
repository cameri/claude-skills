import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, statSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { loadNsec, saveNsec, credentialsPath } from './credentials'

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'replicator-credentials-test-'))
}

describe('loadNsec', () => {
  test('returns null when no credentials file exists', () => {
    const dir = tmpDir()
    expect(loadNsec(dir)).toBeNull()
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('saveNsec / loadNsec round trip', () => {
  test('what is saved is what loads back', () => {
    const dir = tmpDir()
    saveNsec(dir, 'nsec1exampletest')
    expect(loadNsec(dir)).toBe('nsec1exampletest')
    rmSync(dir, { recursive: true, force: true })
  })

  test('writes the credentials file with 0600 permissions', () => {
    const dir = tmpDir()
    saveNsec(dir, 'nsec1exampletest')
    const mode = statSync(credentialsPath(dir)).mode & 0o777
    expect(mode).toBe(0o600)
    rmSync(dir, { recursive: true, force: true })
  })

  test('creates the directory if missing', () => {
    const dir = join(tmpDir(), 'nested', 'path')
    saveNsec(dir, 'nsec1exampletest')
    expect(loadNsec(dir)).toBe('nsec1exampletest')
    rmSync(dir, { recursive: true, force: true })
  })
})
