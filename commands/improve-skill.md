# /improve-skill

Analyze and improve an existing Claude Code skill using the design principles in `/create-skill` as the source of truth.

Arguments passed: `$ARGUMENTS`

`$ARGUMENTS` is a path to a skill directory or a `plugin:skill-name` reference (e.g. `wallabag:configure`, `~/Workspace/my-skill/skills/configure`). If empty, ask the user which skill to improve before proceeding.

---

## Step 1 — Locate the skill

Resolve `$ARGUMENTS` to a skill directory:

- If it looks like a path, use it directly.
- If it looks like `plugin:skill-name`, search `~/Workspace/` for `<plugin>*/skills/<skill-name>/`.
- If ambiguous or not found, list candidate matches and ask the user to confirm.

Read the following files from the skill directory (skip any that don't exist):
- `SKILL.md` (required — stop and report if missing)
- `scripts/*`
- `references/*`
- `assets/*` (note filenames only; don't load binary content)

Also read `~/.claude/commands/create-skill.md` to load the current design principles.

---

## Step 2 — Audit the skill

Evaluate the skill against each principle from `/create-skill`. For every issue found, note:
- **What**: the specific problem
- **Where**: file + line or section
- **Why it matters**: impact on trigger accuracy, context efficiency, or reliability
- **Fix**: concrete proposed change

Check each of the following:

### Frontmatter
- [ ] `description` covers both *what* the skill does and *when* to trigger it (specific user phrases, contexts)
- [ ] No "When to Use" section exists in the body (that content belongs in `description`)
- [ ] `allowed-tools` is present and scoped as narrowly as possible

### Body
- [ ] Written in imperative form throughout
- [ ] Under 500 lines
- [ ] Only contains context Claude doesn't already have — remove explanations of things Claude knows
- [ ] No auxiliary files referenced or created inside the skill dir (no README, CHANGELOG, etc.)

### Progressive disclosure
- [ ] Detailed reference material (API schemas, long docs, exhaustive option lists) is in `references/` files, not inlined
- [ ] Any `references/` files are explicitly linked from SKILL.md with a note on *when* to read them
- [ ] Repeated or boilerplate code is in `scripts/` rather than embedded inline
- [ ] Static output files (templates, assets) live in `assets/` rather than being generated from scratch each time

### Degrees of freedom
- [ ] Fragile, order-sensitive operations have specific step-by-step instructions (low freedom)
- [ ] Flexible, judgment-based operations use high-level guidance or heuristics (high freedom)
- [ ] The level of specificity matches the actual fragility of the operation

---

## Step 3 — Present findings

Show a prioritized list of issues grouped by severity:

- **High** — causes the skill to misfires, never trigger, or produce unreliable results
- **Medium** — wastes context window or makes the skill harder to maintain
- **Low** — style / minor clarity improvements

For each issue include the proposed fix. If there are no issues, say so and stop.

Ask the user: *"Shall I apply all fixes, or would you like to review them one by one?"*

---

## Step 4 — Apply improvements

Apply fixes as confirmed by the user. When editing `SKILL.md`:
- Preserve all existing correct content — only change what was flagged
- If splitting content into `references/` files, create those files and add explicit links back in SKILL.md

After applying, re-run the audit checklist mentally and confirm all flagged issues are resolved.

---

## Step 5 — Report

Summarize:
- What was changed and why
- Any issues intentionally left unfixed (and why)
- Suggested next step (e.g. test the skill on a real task, add a missing `references/` file)
