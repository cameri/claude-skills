---
name: deep-dive
description: Conduct a comprehensive, multi-source investigation of a topic — how it works, why it exists, best practices, limitations, and current trends. Use only when the user explicitly asks for a deep dive or thorough investigation into a topic — the agent must not initiate this unprompted, it is a deliberate, potentially token-heavy investigation.
user-invocable: true
allowed-tools:
  - WebSearch
  - WebFetch
  - Read
  - Write
---

<objective>
Conducts a deep-dive investigation into $ARGUMENTS (or the current topic if
none given) — going beyond surface-level understanding by synthesizing
multiple sources into comprehensive, sourced knowledge.
</objective>

<quick_start>Confirm the topic and the questions it must answer from $ARGUMENTS (ask if unclear), then gather 3+ independent sources across the mechanics/history/usage/limitations angles before synthesizing.</quick_start>

<workflow>
1. If no clear topic is given in $ARGUMENTS or recent context, ask what to
   investigate and what questions it needs to answer, rather than guessing.
2. Define the scope and the key questions this research needs to answer.
3. Gather information from multiple angles: how it works (mechanics), why it
   exists (history/motivation), how it's used (patterns/best practices),
   where it fails (limitations/edge cases), and where it's heading (current
   state and trends).
4. Synthesize the angles into one coherent understanding rather than
   reporting them as disconnected facts.
5. Call out what's still unknown or unresolved after the research, rather
   than papering over gaps.
6. If authoritative sources are unavailable or disagree, state it plainly
   and mark confidence instead of padding with weak sources.
</workflow>

<success_criteria>
- Answers the key questions thoroughly, not just superficially
- Goes beyond "what" to cover "why" and "when" — not a surface-level summary
- Cites real sources for material claims, not unsourced assertions
- Limitations and edge cases are stated honestly
- Explicit about what remains unknown after the research
</success_criteria>
