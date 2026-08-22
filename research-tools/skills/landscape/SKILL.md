---
name: landscape
description: Map the full space around a domain — categories, established and emerging players, tools, trends, and gaps. Use only when the user explicitly asks to map a landscape or space — do not initiate this on your own, it is a deliberate, potentially token-heavy investigation.
user-invocable: true
allowed-tools:
  - WebSearch
  - WebFetch
  - Read
  - Write
---

<objective>
Maps the landscape of $ARGUMENTS (or the current topic if none given) — who
the players are, what tools exist, where things are heading, and where the
white space is.
</objective>

<workflow>
1. If no clear domain/space is given in $ARGUMENTS or recent context, ask
   what to map and how broad to go, rather than guessing.
2. Define the space's boundaries — what's in scope and what's explicitly
   excluded.
3. Break the space into categories that are mutually exclusive and, together,
   cover the whole domain.
4. For each category, map established players, emerging players, and key
   tools, plus where that category is trending.
5. Step back across categories to name overall trends and their
   implications.
6. Identify genuine gaps/white space — underserved segments, not just
   missing features — and size the opportunity where possible.
7. Close with what this map implies for the reader's own strategy or project.
</workflow>

<success_criteria>
- Categories are mutually exclusive and collectively cover the space
- Names real players and real tools, not abstract category placeholders
- Trends are backed by evidence, not asserted
- Gaps are genuine underserved opportunities, not just feature checklists
- Ends with concrete implications for the reader's own positioning
</success_criteria>
