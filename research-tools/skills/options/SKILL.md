---
name: options
description: Compare multiple concrete options (tools, approaches, vendors, architectures) side-by-side against weighted criteria and end with an actual recommendation. Use only when the user explicitly asks to compare options or wants help choosing between alternatives — do not initiate this on your own, it is a deliberate, potentially token-heavy investigation.
user-invocable: true
allowed-tools:
  - WebSearch
  - WebFetch
  - Read
  - Write
---

<objective>
Compares options for $ARGUMENTS (or the current topic if none given) — a
structured side-by-side comparison to make an informed decision. Works for
tools, approaches, vendors, or architectures.
</objective>

<workflow>
1. If the decision, the candidate options, or the decision criteria are not
   clear from $ARGUMENTS or recent context, ask rather than guessing.
2. Define the decision criteria that actually matter for this choice, and
   weight each by importance (not every criterion counts equally).
3. List the genuinely viable options — enough to be a real comparison, not a
   strawman with one clear favorite.
4. Evaluate every option against every criterion, with a justified rating,
   not an arbitrary score.
5. Weigh the evaluations against the criteria weights to reach a
   recommendation, and name a runner-up with the specific condition under
   which it would be the better pick instead.
</workflow>

<success_criteria>
- Criteria reflect what actually matters for this specific decision
- Options are genuinely comparable (apples to apples), not skewed toward one
- Ratings are justified with reasoning, not arbitrary numbers
- Ends with an actual pick, not just a comparison table
- Names a runner-up with the specific condition that would flip the choice
</success_criteria>
