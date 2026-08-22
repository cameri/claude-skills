---
name: audit-skill
description: Audit a SKILL.md file for YAML compliance, pure XML structure, progressive disclosure, and Agent Skills best practices. Use when the user asks to audit, review, or check a skill file, or wants to know if a SKILL.md follows best practices.
user-invocable: true
allowed-tools:
  - Read
  - Bash(ls *)
---

<objective>
Invokes the `agent-resources:skill-auditor` subagent to audit the skill at the given path against Agent Skills best practices — structure, conciseness, progressive disclosure, and effectiveness.
</objective>

<quick_start>
`/agent-resources:audit-skill <path-to-skill-directory-or-SKILL.md>`
</quick_start>

<workflow>
1. Resolve the target path from `$ARGUMENTS`. If it's a directory, look for `SKILL.md` inside it. If no argument was given, ask the user which skill to audit — do not guess.
2. Invoke the `agent-resources:skill-auditor` subagent via the `Agent` tool, passing the resolved skill path.
3. Present the subagent's findings verbatim, including file:line locations, compliance notes, and any recommendations — do not summarize away specifics.
</workflow>

<success_criteria>
- Subagent invoked with the correct resolved path
- Findings presented with file:line locations intact, not paraphrased into vagueness
</success_criteria>
