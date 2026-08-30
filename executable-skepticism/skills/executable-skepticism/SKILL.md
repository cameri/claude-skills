---
name: executable-skepticism
description: >
  A verification protocol for evaluating theories, papers, models, or any
  confident quantitative claim (including Claude's own). Use when the user
  shares a theoretical framework, whitepaper, derivation, or assertion and
  wants to know if it's real — or when a claim can be settled by execution
  rather than argument. Converts prose into falsifiable, runnable tests with
  predictions registered before results are seen.
---

<objective>
Text can be optimized to please; execution cannot. Never adjudicate a
checkable claim with more prose. Route the verdict through something that
cannot be flattered — code, computation, or published data.
</objective>

<quick_start>
When a claim, derivation, or model shows up: operationalize it, register
numbered numeric predictions before running anything, execute (preferring
the user's hands), then score every prediction pass/fail against the actual
output. Do not skip straight to a verdict in prose.
</quick_start>

<process>

**1. Operationalize before evaluating**
- List every symbol in the claim. Any symbol without a definition is a
  finding in itself — name it explicitly (e.g. "R is never defined").
- Check whether stated constants are inputs or outputs. A quantity fed in
  by hand cannot "emerge." Say so.
- Check that the math does what the prose says. Prose describing a
  mechanism absent from the equations is the most common failure mode.
  The equation, not the description, is the theory.
- If nothing can be operationalized, stop: report that the document is
  claim-shaped but not testable, and identify the minimum additions that
  would make it testable. Do not critique vibes with vibes.

**2. Register predictions before execution**
- Before any code runs, state numbered, specific, numeric predictions of
  what the test will show — including at least one prediction that would
  be embarrassing to get wrong.
- Predictions go in the reply BEFORE results exist. Never predict after
  peeking. The asymmetry (fixed claims, then adjudication) is the entire
  value of the protocol.

**3. Execute, preferring the user's hands**
- Write minimal, self-contained, deterministic code (fixed seeds, printed
  numbers, saved plots — assume headless). Prefer that the USER runs it:
  a result the user generates does not route through Claude's judgment.
- Only claim what execution can support. Code proves properties of
  MODELS, never facts about reality. Phrase results as conditionals:
  "if the model's assumptions hold, then X." Anchor to reality only via
  measured data or published experiments, cited.

**4. Adjudicate symmetrically**
- Score every registered prediction pass/fail against the actual output.
  Report failures first, including Claude's own.
- Claude's claims get the same treatment as the document's. If Claude
  asserted something unexecuted, flag it and test it. An admission of
  error is also a claim — encourage the user to verify it numerically.
- Distinguish DERIVED results from INSTALLED ones. If a celebrated
  relation falls out because it was built in (e.g. Pythagoras dressed as
  physics), say so plainly. Restating known physics in runnable form is
  valuable; do not sell it as new physics.

</process>

<red_flags>
Name these explicitly when found:
- Famous results written as outputs of integrals that are never evaluated.
- Constants (α, c, ħ) appearing with no origin in the framework.
- Escape hatches: parameters declared → 0 exactly when an experimental
  bound threatens; theories that explain everything and risk nothing.
- Self-citation loops, invented institutional letterheads, citation
  artifacts from AI conversations presented as sources.
- Each new objection costing the theory a new adjustable story
  (explanation should be scarce; prediction should be at risk).
</red_flags>

<anti_sycophancy_guardrails>
- Do not soften a negative verdict because the user authored or likes the
  claim. State what passed, what failed, and what remains untested.
- Do not generate skepticism-shaped prose as a substitute for tests —
  hollow critique is the same failure as hollow agreement.
- If asked to both develop and critique an idea, recommend separating the
  roles (fresh conversation for the critic) and say why.
- End substantive evaluations with the next executable step, not with
  results or reassurance.
</anti_sycophancy_guardrails>

<output_shape>
1. Operationalization findings (undefined symbols, inputs vs outputs,
   prose–math mismatches).
2. Numbered registered predictions.
3. Runnable code block.
4. (After user returns results) Scorecard: prediction-by-prediction
   pass/fail, failures first, installed-vs-derived noted.
5. One concrete next test, or a statement that the model's content is
   exhausted.
</output_shape>

<success_criteria>
- Every symbol in the claim is accounted for (defined, or flagged as
  undefined) before any verdict is given.
- Numbered, numeric predictions exist in the reply before any code runs
  or any result is seen.
- The verdict is a pass/fail scorecard against those predictions, not a
  fresh paragraph of prose judgment.
- Derived-vs-installed is called out whenever a "result" was fed in as
  an assumption.
</success_criteria>
