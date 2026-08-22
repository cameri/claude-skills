---
name: technical
description: Research concrete implementation approaches for something you need to build — libraries, patterns, architectures — with honest tradeoffs and a recommendation fitted to stated constraints. Use only when the user explicitly asks for technical/implementation research — do not initiate this on your own, it is a deliberate, potentially token-heavy investigation.
user-invocable: true
allowed-tools:
  - WebSearch
  - WebFetch
  - Read
  - Write
---

<objective>
Researches technical implementation approaches for $ARGUMENTS (or the
current topic if none given) — concrete ways to build it (libraries,
patterns, architectures) with honest tradeoffs for each.
</objective>

<workflow>
1. If what needs to be built, or its hard constraints (language/framework,
   integration requirements, performance needs), aren't clear from
   $ARGUMENTS or recent context, ask rather than guessing.
2. Identify 2-4 genuinely different implementation approaches — not
   variations on the same idea with different names.
3. For each approach, research: how it works, the specific libraries/tools
   it involves (with real, current versions where relevant), its
   complexity, its performance characteristics, and its community/
   maintenance health (is it actively maintained, is it a dead project).
4. Compare the approaches honestly — real pros and cons, not a sales pitch
   for the one that looks best on the surface.
5. Recommend one approach fitted to the stated constraints, with enough
   concreteness (starting point, order of implementation, known gotchas)
   that someone could begin building from it immediately.
</workflow>

<success_criteria>
- Approaches are genuinely distinct, not the same thing with different labels
- Tradeoffs are honest — cons are as real and specific as pros, not filler
- Names real, current libraries/tools rather than generic descriptions
- Recommendation is fitted to the stated constraints, not a generic default
- Gives enough detail (starting point, gotchas) to begin implementing
  immediately, not just a comparison for its own sake
</success_criteria>
