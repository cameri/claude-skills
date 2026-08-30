---
name: competitive
description: Research the competitive landscape for a product or feature — who else solves this problem, how, and where the gaps are. Use only when the user explicitly asks for competitive research or analysis — the agent must not initiate this unprompted, it is a deliberate, potentially token-heavy investigation.
user-invocable: true
allowed-tools:
  - WebSearch
  - WebFetch
  - Read
  - Write
---

<objective>
Researches the competitive landscape for $ARGUMENTS (or the current topic if
none given) — who else solves this problem, how they do it, and where the
opportunities are.
</objective>

<quick_start>Confirm the product/feature subject from $ARGUMENTS (ask if unclear), then identify 3–5 real competitors via WebSearch before assessing each against the workflow below.</quick_start>

<workflow>
1. If no clear subject is given in $ARGUMENTS or recent context, ask what to
   research rather than guessing.
2. Define the problem/space being competed in.
3. Identify 3-5 direct and indirect competitors or alternatives.
4. For each, assess: how they solve the problem, who they target, strengths,
   weaknesses, and pricing/business model.
5. Look across all of them for patterns — what's table stakes that any
   entrant must have.
6. Synthesize into a clear recommendation: where's the actual opportunity or
   gap, given what already exists.
7. If authoritative sources are unavailable or disagree, state it plainly
   and mark confidence instead of padding with weak sources.
</workflow>

<success_criteria>
- Named specific competitors/alternatives, not generic categories
- Each has a real strength/weakness assessment, not filler
- Patterns (table stakes) are called out separately from genuine gaps
- Ends with an opportunity/gap conclusion, not just a list
</success_criteria>
