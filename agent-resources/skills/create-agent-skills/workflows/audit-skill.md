# Workflow: Audit a Skill

<required_reading>
**Read these reference files NOW:**
1. references/recommended-structure.md
2. references/skill-structure.md
3. references/use-xml-tags.md
</required_reading>

<process>
## Step 1: List Available Skills

**DO NOT use AskUserQuestion** - there may be many skills.

Enumerate skills in chat as numbered list:
```bash
ls ~/.claude/skills/
```

Present as:
```
Available skills:
1. create-agent-skills
2. build-macos-apps
3. manage-stripe
...
```

Ask: "Which skill would you like to audit? (enter number or name)"

## Step 2: Read the Skill

After user selects, read the full skill structure:
```bash
# Read main file
cat ~/.claude/skills/{skill-name}/SKILL.md

# Check for workflows and references
ls ~/.claude/skills/{skill-name}/
ls ~/.claude/skills/{skill-name}/workflows/ 2>/dev/null
ls ~/.claude/skills/{skill-name}/references/ 2>/dev/null
```

## Step 3: Run Audit Checklist

Evaluate against each criterion:

### YAML Frontmatter
- [ ] Has `name:` field (lowercase-with-hyphens)
- [ ] Name matches directory name
- [ ] Has `description:` field
- [ ] Description says what it does AND when to use it
- [ ] Description is third person ("Use when...")

### Structure
- [ ] SKILL.md under 500 lines
- [ ] Pure XML structure (no markdown headings # in body)
- [ ] All XML tags properly closed
- [ ] Has required tags: objective OR essential_principles
- [ ] Has success_criteria

### Router Pattern (if complex skill)
- [ ] Essential principles inline in SKILL.md (not in separate file)
- [ ] Has intake question
- [ ] Has routing table
- [ ] All referenced workflow files exist
- [ ] All referenced reference files exist

### Workflows (if present)
- [ ] Each has required_reading section
- [ ] Each has process section
- [ ] Each has success_criteria section
- [ ] Required reading references exist

### Portability
- [ ] No absolute file paths outside the skill directory itself
- [ ] No hardcoded repo names, usernames, or org names
- [ ] No hardcoded service names, container names, or port numbers
- [ ] No hardcoded health check strings or log patterns
- [ ] No hardcoded trusted user or principal lists
- [ ] Project-specific values documented in the plugin's CLAUDE.md
- [ ] Skill reads CLAUDE.md (or equivalent) at runtime for project-specific values

### Content Quality
- [ ] Principles are actionable (not vague platitudes)
- [ ] Steps are specific (not "do the thing")
- [ ] Success criteria are verifiable
- [ ] No redundant content across files

## Step 4: Check Degrees of Freedom

For each step or operation in the skill, evaluate whether the instruction specificity matches the actual fragility:

- **Fragile / order-sensitive operations** (e.g. API calls, file transforms, multi-step deploys) → should have specific step-by-step instructions (low freedom). Flag if guidance is vague.
- **Flexible / judgment-based operations** (e.g. "write a summary", "choose appropriate format") → should use high-level guidance or heuristics (high freedom). Flag if over-constrained with rigid MUSTs.
- **Mismatch**: rigid instructions on flexible tasks waste tokens and limit Claude's reasoning; vague instructions on fragile tasks cause errors.

## Step 5: Generate Report

Present findings grouped by severity:

**High** — causes the skill to misfire, never trigger, or produce unreliable results
**Medium** — wastes context window, makes the skill harder to maintain, or mismatches degrees of freedom
**Low** — style or minor clarity improvements

```
## Audit Report: {skill-name}

### ✅ Passing
- [list passing items]

### ⚠️ Issues Found

**High**
1. **[Issue name]**: [Description]
   → Fix: [Specific action]

**Medium**
2. **[Issue name]**: [Description]
   → Fix: [Specific action]

**Low**
3. **[Issue name]**: [Description]
   → Fix: [Specific action]

### 📊 Score: X/Y criteria passing
```

## Step 6: Offer Fixes

If issues found, ask:
"Would you like me to fix these issues?"

Options:
1. **Fix all** - Apply all recommended fixes
2. **Fix one by one** - Review each fix before applying
3. **Just the report** - No changes needed

If fixing:
- Make each change
- Verify file validity after each change
- Report what was fixed
</process>

<audit_anti_patterns>
## Common Anti-Patterns to Flag

**Skippable principles**: Essential principles in separate file instead of inline
**Monolithic skill**: Single file over 500 lines
**Mixed concerns**: Procedures and knowledge in same file
**Vague steps**: "Handle the error appropriately"
**Untestable criteria**: "User is satisfied"
**Markdown headings in body**: Using # instead of XML tags
**Missing routing**: Complex skill without intake/routing
**Broken references**: Files mentioned but don't exist
**Redundant content**: Same information in multiple places
**Hardcoded external references**: Project-specific paths, repo names, service names, health signals, or trusted users embedded in skill files instead of the plugin's CLAUDE.md
</audit_anti_patterns>

<success_criteria>
Audit is complete when:
- [ ] Skill fully read and analyzed
- [ ] All checklist items evaluated
- [ ] Report presented to user
- [ ] Fixes applied (if requested)
- [ ] User has clear picture of skill health
</success_criteria>
