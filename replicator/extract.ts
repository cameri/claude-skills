export type InvocationCounts = Record<string, number>

// Parses the output of scripts/grep-skill-usage.sh: lines like
// `  3   skill: superpowers:brainstorming"` (from grepping the Skill tool's
// input JSON) and `  2 /clear` (from grepping <command-name> tags).
export function parseSkillUsage(text: string): InvocationCounts {
  const counts: InvocationCounts = {}
  for (const line of text.split('\n')) {
    const skillMatch = /^\s*(\d+)\s+skill:\s*([a-zA-Z0-9_.:-]+)/.exec(line)
    if (skillMatch) {
      const [, n, name] = skillMatch
      counts[name] = (counts[name] ?? 0) + Number(n)
      continue
    }
    const cmdMatch = /^\s*(\d+)\s+\/([a-zA-Z0-9_-]+)/.exec(line)
    if (cmdMatch) {
      const [, n, name] = cmdMatch
      const key = `slash:${name}`
      counts[key] = (counts[key] ?? 0) + Number(n)
    }
  }
  return counts
}
