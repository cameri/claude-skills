import { describe, expect, test } from 'bun:test'
import { parseSkillUsage } from './extract'

describe('parseSkillUsage', () => {
  test('parses skill-invocation lines', () => {
    const input = `  3   skill: superpowers:brainstorming"\n  1   skill: journal:update-journal"\n`
    expect(parseSkillUsage(input)).toEqual({
      'superpowers:brainstorming': 3,
      'journal:update-journal': 1,
    })
  })

  test('parses slash-command lines under a slash: prefix', () => {
    const input = `  2 /clear\n  1 /model\n`
    expect(parseSkillUsage(input)).toEqual({ 'slash:clear': 2, 'slash:model': 1 })
  })

  test('routes a namespaced slash command to the bare plugin:skill key, no slash: prefix', () => {
    const input = `  4 /actual-budget:access\n  2 /cronjobs:cronjob\n  1 /superpowers:test-driven-development\n`
    expect(parseSkillUsage(input)).toEqual({
      'actual-budget:access': 4,
      'cronjobs:cronjob': 2,
      'superpowers:test-driven-development': 1,
    })
  })

  test('a non-namespaced slash command still gets the slash: prefix', () => {
    const input = `  3 /clear\n`
    expect(parseSkillUsage(input)).toEqual({ 'slash:clear': 3 })
  })

  test('sums a namespaced slash command with the same key recorded via the Skill-tool convention', () => {
    const input = `  2   skill: cronjobs:cronjob"\n  1 /cronjobs:cronjob\n`
    expect(parseSkillUsage(input)).toEqual({ 'cronjobs:cronjob': 3 })
  })

  test('sums duplicate keys across lines', () => {
    const input = `  1   skill: foo:bar"\n  2   skill: foo:bar"\n`
    expect(parseSkillUsage(input)).toEqual({ 'foo:bar': 3 })
  })

  test('ignores unrelated lines', () => {
    const input = `=== Aug 14 20:57\nsome noise\n`
    expect(parseSkillUsage(input)).toEqual({})
  })

  test('empty input produces empty counts', () => {
    expect(parseSkillUsage('')).toEqual({})
  })
})
