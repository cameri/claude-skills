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
    const cmdMatch = /^\s*(\d+)\s+\/([a-zA-Z0-9_:-]+)/.exec(line)
    if (cmdMatch) {
      const [, n, name] = cmdMatch
      // A namespaced invocation (e.g. /cronjobs:cronjob) already matches the
      // `plugin:skill` gene-key convention the Skill-tool branch above uses —
      // route it there directly. A bare command (e.g. /clear) has no plugin
      // namespace, so it gets the slash: prefix to avoid colliding with a
      // same-named gene key.
      const key = name.includes(':') ? name : `slash:${name}`
      counts[key] = (counts[key] ?? 0) + Number(n)
    }
  }
  return counts
}
