---
name: whats-next
description: Writes a comprehensive handoff document capturing everything about the current conversation, so work can resume with zero information loss after a context reset or session restart. Use when the user asks to save progress, prepare for a restart, write a handoff, or when a session is about to run out of context and the current work should survive it.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash
  - WebSearch
  - WebFetch
---

<essential_principles>
Priority is comprehensive detail and precision over brevity. The goal is to let someone — or a fresh Claude instance with none of this conversation's context — pick up exactly where the work left off with zero information loss. Adapt the level of detail to the task type (coding, research, analysis, writing, configuration, etc.) but never sacrifice coverage for concision.

Write the handoff to `whats-next.md` in the current working directory, using the exact XML output format below. This is a proven, already-in-use format — do not redesign or paraphrase the section tags.

If this sandbox has `sandbox-manager`'s `setup-hooks` skill's `whats-next-check` hook installed, a `whats-next.md` left at the project root is picked up automatically on the next session start and offered back to Claude to resume — so writing to that exact path and filename matters, not just producing similar content elsewhere.
</essential_principles>

<objective>
Analyze the current conversation and produce a complete handoff document at `whats-next.md`, covering six areas: what was originally asked, what has been done, what remains, what was tried and failed, everything essential to know, and the exact current state.
</objective>

<quick_start>
Write directly to `whats-next.md` in the current working directory, filling in the six section tags from `<output_format>` — `original_task`, `work_completed`, `work_remaining`, `attempted_approaches`, `critical_context`, `current_state`.
</quick_start>

<workflow>
1. Identify the original task and its precise scope (see `<output_format>`'s `original_task` tag for what belongs there).
2. Fill `<work_completed>` with everything accomplished — see that tag's own bullets in `<output_format>` for what belongs in it.
3. Fill `<work_remaining>` with everything still to do — see that tag's own bullets in `<output_format>`.
4. Fill `<attempted_approaches>` with everything tried, including failures — see that tag's own bullets in `<output_format>`.
5. Fill `<critical_context>` with everything essential to know — see that tag's own bullets in `<output_format>`.
6. Fill `<current_state>` with the exact current state — see that tag's own bullets in `<output_format>`.
7. Write all six sections into `whats-next.md` in the current working directory, using the exact tags in `<output_format>` below — that tag's bullets are the single source of truth for what belongs in each section, do not restate them here.
</workflow>

<output_format>
```xml
<original_task>
[The specific task that was initially requested - be precise about scope, and exclude new scope or side tasks that emerged later]
</original_task>

<work_completed>
[Comprehensive detail of everything accomplished:
- Artifacts created/modified/analyzed (with specific references)
- Specific changes, additions, or findings (with details and locations)
- Actions taken (commands, searches, API calls, tool usage, etc.)
- Key discoveries or insights
- Decisions made and reasoning
- Side tasks completed]
</work_completed>

<work_remaining>
[Detailed breakdown of what needs to be done, as specific, actionable steps:
- Specific tasks with precise locations or references
- Exact targets to create, modify, or analyze
- Dependencies, prerequisites, and ordering
- Validation or verification steps needed]
</work_remaining>

<attempted_approaches>
[Everything tried, including failures:
- Approaches that didn't work and why
- Errors, blockers, or limitations encountered
- Dead ends to avoid
- Alternative approaches considered but not pursued]
</attempted_approaches>

<critical_context>
[All essential knowledge for continuing:
- Key decisions and trade-offs
- Constraints, requirements, or boundaries
- Important discoveries, gotchas, edge cases, or non-obvious behaviors
- Environment, configuration, or setup details
- Assumptions requiring validation
- References to documentation, sources, or resources]
</critical_context>

<current_state>
[Exact state of the work:
- Status of deliverables (complete/in-progress/not started)
- What's committed, saved, or finalized vs. what's temporary or draft
- Temporary changes or workarounds in place
- Current position in workflow or process
- Any open questions or pending decisions]
</current_state>
```
</output_format>

<success_criteria>
`whats-next.md` exists in the current working directory and contains all six sections, each with substantive content (not placeholders) that a fresh Claude instance — with no memory of this conversation — could read and resume the work from without needing to ask clarifying questions about anything covered above.
</success_criteria>
