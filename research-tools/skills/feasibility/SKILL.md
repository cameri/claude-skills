---
name: feasibility
description: Assess whether a proposed project or idea is actually achievable given real technical, resource, and external-dependency constraints, ending in a clear go/no-go verdict. Use only when the user explicitly asks for a feasibility assessment or reality check — the agent must not initiate this unprompted, it is a deliberate, potentially token-heavy investigation.
user-invocable: true
allowed-tools:
  - WebSearch
  - WebFetch
  - Read
  - Write
---

<objective>
Assesses the feasibility of $ARGUMENTS (or the current topic if none given) —
an honest reality check on whether it can actually be done given technical,
resource, and external constraints.
</objective>

<quick_start>Confirm the project/idea and known constraints from $ARGUMENTS (ask if unclear), then research the technical, resource, and external-dependency dimensions before issuing a verdict.</quick_start>

<workflow>
1. If no clear project/idea is given in $ARGUMENTS or recent context, ask
   what to assess and what constraints are known, rather than guessing.
2. Define clearly what is being assessed.
3. Evaluate technical feasibility: are there known approaches, how mature is
   the technology, and what are the technical risks.
4. Evaluate resource feasibility: skills, budget, tools/infrastructure —
   have vs. need to acquire.
5. Evaluate external-dependency feasibility: reliability of APIs/services,
   third-party integrations, and access to external data.
6. Identify concrete blockers with severity and a mitigation for each, plus
   any de-risking options that reduce risk before committing further.
7. Give an overall verdict — Go / Go with conditions / No-go — with the
   reasoning and conditions spelled out, not left implicit.
8. If authoritative sources are unavailable or disagree, state it plainly
   and mark confidence instead of padding with weak sources.
</workflow>

<success_criteria>
- Assessment is honest — neither optimistic-washed nor reflexively negative
- All three dimensions (technical, resource, external) are actually evaluated
- Blockers are specific and addressable, not vague hand-waving
- Ends with a real verdict (Go / Go with conditions / No-go), not just a list
  of considerations
- If conditional, states the specific conditions required for a "go"
</success_criteria>
