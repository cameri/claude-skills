# executable-skepticism

Claude Code plugin that turns a theory, paper, model, or confident
quantitative claim (including Claude's own) into a falsifiable, runnable
test — instead of a debate in prose.

## Skills

### `/executable-skepticism:executable-skepticism`

Use when someone shares a theoretical framework, whitepaper, derivation, or
assertion and wants to know if it holds up, or when a claim can be settled
by execution rather than argument.

The protocol:

1. **Operationalize** — name every undefined symbol, flag inputs dressed up
   as outputs, and check the math actually matches the prose.
2. **Register predictions** — numbered, numeric, stated before any code
   runs or any result is seen.
3. **Execute** — minimal, deterministic, headless-safe code; prefers the
   user's own hands so the result doesn't route through Claude's judgment.
4. **Adjudicate symmetrically** — score every prediction pass/fail,
   failures first, and call out results that were installed rather than
   derived.

No credentials or external services required.

## License

MIT
