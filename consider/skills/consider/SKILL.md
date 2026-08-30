---
name: consider
description: Apply a decision-making framework to a real choice, tradeoff, or risky plan — inversion (pre-mortem), first-principles (rebuild from fundamentals), second-order effects (consequences of consequences), Pareto (80/20 scoping), via negativa (improve by removing), opportunity cost, or Eisenhower prioritization (urgent/important). Use when a decision has real stakes — before committing to a risky migration or infra change, when scoping a large task, when prioritizing a backlog, or when a plan's downstream effects haven't been thought through — not for routine, low-stakes choices.
user-invocable: true
---

<objective>
Applies one of seven proven thinking-model frameworks to a real decision, tradeoff, or plan, chosen by fit rather than by the user having to name one.
<quick_start>
Pick a framework by fit: risky/irreversible plan → inversion; approach inherited from precedent → first-principles; wide blast radius → second-order effects; large/ambiguous scope → Pareto; growing complexity → via negativa; mutually exclusive options → opportunity cost; backlog → Eisenhower matrix. Apply it directly and end with a recommendation.
</quick_start>

<when_to_use>
Do not reach for this on routine, low-stakes, or already-decided matters —
applying a framework to a trivial choice is noise, not rigor.
</when_to_use>

<framework_selection>
Pick the framework that fits the situation, or name it explicitly if the user
already asked for one by name (e.g. "let's think about this via inversion"):

- **Inversion** — the plan is risky or the user is about to commit to
  something hard to undo. Instead of asking "how do I succeed?", ask "what
  would guarantee this fails?" List concrete failure modes, pair each with a
  specific avoidance action, and distill a short "never do" list — success
  comes from systematically avoiding the failure modes, not from a generic
  optimism check.
- **First-principles** — the current approach is inherited from precedent,
  convention, or analogy ("we've always done it this way", "X worked for Y
  so...") rather than derived from what's actually required. List the current
  assumptions, challenge each one (true / false / partially true), keep only
  the truths that can't be reduced further, and rebuild the solution from
  those alone — this often surfaces options the inherited approach hid.
- **Second-order effects** — the change has wide blast radius (infra,
  automation, a policy affecting multiple people) or looks good only at first
  glance. State the action, list its first-order (immediate) effects, then
  keep asking "and then what?" through second- and, where it matters,
  third-order consequences. Surface delayed costs or benefits that don't
  show up immediately, then give a revised verdict on whether it's still
  worth it once the full chain is traced.
- **Pareto (80/20)** — the task is large or ambiguously scoped, or there are
  many candidate factors competing for attention. List the factors in scope,
  rank them by actual impact on the outcome, and find the cutoff where the
  vital ~20% accounts for ~80% of the result. Call out the trivial-many
  explicitly as safe to deprioritize or ignore, not just omit them.
- **Via negativa** — a design, plan, or set of commitments is getting
  complex. List what's currently present, and for each item ask "does
  removing this improve the outcome?" rather than asking what to add.
  Separate genuine subtraction candidates (with the specific improvement
  removal buys) from items that pass the test and should stay, and describe
  the leaner state that results.
- **Opportunity cost** — choosing between mutually exclusive options, or
  deciding whether something is worth doing at all. Name the resources the
  choice actually consumes (time, money, attention, and non-obvious costs
  like reputation), then compare against the *best* alternative use of those
  same resources — not just any alternative. The verdict should state
  plainly what saying yes to this means saying no to.
- **Eisenhower matrix** — a backlog, todo list, or set of competing requests
  needs real prioritization. Sort every item into one of four quadrants by
  important/urgent: do first (both), schedule (important, not urgent),
  delegate or minimize (urgent, not important), or eliminate (neither) — and
  give each item a concrete next action for its quadrant, including explicit
  permission to drop the eliminate-quadrant items.

More than one framework can apply — say so and apply both rather than
forcing a single lens onto a problem that has two real angles.
</framework_selection>

<workflow>
1. Identify the decision, plan, or backlog in question from context (or ask,
   if genuinely ambiguous which thing the user means).
2. Select the framework(s) per <framework_selection>.
3. Apply it directly in the response — show the actual reasoning (e.g. for
   inversion, name concrete specific failure modes, not a generic "things
   could go wrong").
4. State a conclusion or recommendation, not just the raw framework output —
   the point is to inform a decision, not to perform an exercise.
</workflow>

<success_criteria>
- The chosen framework actually fits the situation, not applied reflexively
- Output names concrete specifics (real failure modes, real second-order
  effects, real percentages) rather than generic placeholders
- Ends in an actual recommendation or conclusion
</success_criteria>
