---
name: audit-subagent
description: Audit a subagent configuration file for role definition, prompt quality, tool selection, and XML structure compliance. Use when the user asks to audit, review, or check a subagent file, or wants to know if a subagent definition follows best practices.
user-invocable: true
allowed-tools:
  - Read
  - Bash(ls *)
---

<objective>
Invokes the `agent-resources:subagent-auditor` subagent to audit the subagent configuration at the given path — role definition, prompt quality, tool selection, and effectiveness.
</objective>

<quick_start>
`/agent-resources:audit-subagent <path-to-subagent-md-file>`
</quick_start>

<workflow>
1. Resolve the target path from `$ARGUMENTS`. If no argument was given, ask the user which subagent file to audit — do not guess.
2. Invoke the `agent-resources:subagent-auditor` subagent via the `Agent` tool, passing the resolved path.
3. Present the subagent's findings verbatim, including file:line locations and recommendations.
</workflow>

<success_criteria>
- Subagent invoked with the correct resolved path
- Findings presented with file:line locations intact
</success_criteria>
