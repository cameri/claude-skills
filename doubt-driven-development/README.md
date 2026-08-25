# doubt-driven-development

Claude Code plugin that subjects non-trivial in-flight decisions to a
fresh-context adversarial review before they stand — catching wrong
directions while course-correction is still cheap, instead of only at
final review.

## Skills

### `/doubt-driven-development:doubt-driven-development`

Use when correctness matters more than speed: an architectural decision
under uncertainty, non-trivial code about to be committed, a non-obvious
claim ("this is safe", "this scales"), or work in unfamiliar code.

The cycle:

1. **CLAIM** — name the decision and why it matters, in two or three lines.
2. **EXTRACT** — isolate the smallest reviewable artifact + the contract it
   must satisfy, stripped of your own reasoning.
3. **DOUBT** — dispatch a genuinely fresh-context reviewer (a non-`fork`
   Claude Code subagent, or an external CLI) with an adversarial prompt
   that must find issues, not validate. Optionally offers a user-authorized
   cross-model second opinion (Gemini CLI / Codex CLI, read-only sandbox).
4. **RECONCILE** — classify every finding against the artifact text:
   contract misread, valid + actionable, valid trade-off, or noise.
5. **STOP** — bounded at 3 cycles or trivial findings; escalates to the
   user rather than looping forever.

No credentials or external services required — cross-model escalation is
opt-in per call and only runs a locally installed CLI the user explicitly
authorizes.

## Provenance

Adapted from the `doubt-driven-development` skill in
[addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)
(MIT licensed). Cross-references to that pack's own `agents/` persona
roster and `references/orchestration-patterns.md` were rewritten to be
self-contained and Claude-Code-native (explicit `subagent_type` guidance
instead of a persona roster this plugin doesn't ship).

## License

MIT
