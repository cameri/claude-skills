import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const SCRIPT = join(import.meta.dir, 'scripts', 'grep-skill-usage.sh')

function message(content: unknown[], role = 'assistant'): string {
  return JSON.stringify({
    type: 'message',
    id: 'm',
    parentId: 'p',
    timestamp: '2026-09-01T00:00:00Z',
    message: { role, content },
  })
}

function readCall(path: string): Record<string, unknown> {
  return { type: 'toolCall', id: 'c', name: 'read', arguments: { i: 'x', path } }
}

// Runs the script against a temp omp-format transcript dir and returns stdout.
// since=0 includes every file regardless of mtime.
function run(lines: string[], since = '0'): string {
  const dir = mkdtempSync(join(tmpdir(), 'gsu-'))
  try {
    writeFileSync(join(dir, 'session.jsonl'), lines.join('\n') + '\n')
    const r = spawnSync('bash', [SCRIPT, dir, since], { encoding: 'utf8' })
    expect(r.status).toBe(0)
    return r.stdout
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('grep-skill-usage.sh omp branch', () => {
  test('extracts a bare skill activation from a read toolCall', () => {
    const out = run([message([readCall('skill://restart-session')])])
    expect(out.trim()).toBe('1 skill: restart-session')
  })

  test('does not count skill:// text embedded in ordinary content', () => {
    const out = run([message([{ type: 'text', text: 'skill://restart-session is referenced here' }])])
    expect(out.trim()).toBe('')
  })

  test('collapses subpath reads to the skill name', () => {
    const out = run([
      message([readCall('skill://systematic-debugging/SKILL.md')]),
      message([readCall('skill://container-management/workflows/add-service.md')]),
    ])
    expect(out).toContain('1 skill: systematic-debugging')
    expect(out).toContain('1 skill: container-management')
  })

  test('namespaces the skill://<plugin>/<skill> form as plugin:skill', () => {
    const out = run([message([readCall('skill://sandbox-manager/restart-session')])])
    expect(out.trim()).toBe('1 skill: sandbox-manager:restart-session')
  })

  test('emits no slash commands from embedded command-name tags', () => {
    // Include a real toolCall so the dir is detected as omp (not Claude), then
    // assert an embedded command-name tag in content is ignored.
    const out = run([
      message([{ type: 'text', text: '<command-name>/clear</command-name>' }]),
      message([readCall('skill://meditate')]),
    ])
    expect(out.trim()).toBe('1 skill: meditate')
  })

  test('aggregates repeated activations', () => {
    const out = run([message([readCall('skill://meditate')]), message([readCall('skill://meditate')])])
    expect(out.trim()).toBe('2 skill: meditate')
  })

  test('skips transcripts not modified since the given epoch', () => {
    // since in the far future: nothing qualifies
    const out = run([message([readCall('skill://restart-session')])], '9999999999')
    expect(out.trim()).toBe('')
  })
})
