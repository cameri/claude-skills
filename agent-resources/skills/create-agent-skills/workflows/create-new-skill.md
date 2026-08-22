# Workflow: Create a New Skill

<required_reading>
**Read these reference files NOW:**
1. references/recommended-structure.md
2. references/skill-structure.md
3. references/core-principles.md
4. references/use-xml-tags.md
</required_reading>

<process>
## Step 1: Understand with Concrete Examples

Before designing anything, ground the skill in real usage. Ask:

- "What would a user say to trigger this skill? Give me 2–3 example requests."
- "What operations does it need to perform?" (read-only queries, writes, auth flows, etc.)
- "Does it call an external API or service? If so, which one and how is it authenticated?"

**If user provided context** (e.g., "build a skill for X"):
→ Analyze what's stated, what can be inferred, what's genuinely unclear
→ Only ask about real gaps — don't ask things obvious from context

**If user just invoked skill without context:**
→ Ask what they want to build first

Conclude when you have a clear picture of: usage patterns, trigger phrases, operations, and auth/config needs.

### Decision Gate

After initial questions, ask:
"Ready to proceed with building, or would you like me to ask more questions?"

Options:
1. **Proceed to building** - I have enough context
2. **Ask more questions** - There are more details to clarify
3. **Let me add details** - I want to provide additional context

## Step 2: Research Trigger (If External API)

**When external service detected**, ask using AskUserQuestion:
"This involves [service name] API. Would you like me to research current endpoints and patterns before building?"

Options:
1. **Yes, research first** - Fetch current documentation for accurate implementation
2. **No, proceed with general patterns** - Use common patterns without specific API research

If research requested:
- Use Context7 MCP to fetch current library documentation
- Or use WebSearch for recent API documentation
- Focus on 2024-2025 sources
- Store findings for use in content generation

## Step 3: Decide Structure

**Simple skill (single workflow, <200 lines):**
→ Single SKILL.md file with all content

**Complex skill (multiple workflows OR domain knowledge):**
→ Router pattern:
```
skill-name/
├── SKILL.md (router + principles)
├── workflows/ (procedures - FOLLOW)
├── references/ (knowledge - READ)
├── templates/ (output structures - COPY + FILL)
└── scripts/ (reusable code - EXECUTE)
```

Factors favoring router pattern:
- Multiple distinct user intents (create vs debug vs ship)
- Shared domain knowledge across workflows
- Essential principles that must not be skipped
- Skill likely to grow over time

**Consider templates/ when:**
- Skill produces consistent output structures (plans, specs, reports)
- Structure matters more than creative generation

**Consider scripts/ when:**
- Same code runs across invocations (deploy, setup, API calls)
- Operations are error-prone when rewritten each time

**For API-connected plugins, always include an `access` skill:**
- Handles credential storage, connection testing, and status
- Stored at `~/.claude/channels/<plugin-name>/${ENV}.env` (chmod 600)
- Supports: no-args status, `setup` walkthrough, explicit `key=value` save, `clear`
- See `references/common-patterns.md` → `access_skill_pattern`

**Channel server needed?** — Yes if the plugin receives real-time inbound events (messages, webhooks, network events). Channel plugins include a long-running MCP server (`server.ts` + `package.json` + `.mcp.json`) that pushes `notifications/claude/channel` back to Claude.

See references/recommended-structure.md for structure templates.

## Step 4: Plugin-Level Files (for plugins in a monorepo)

If the skill lives inside a plugin monorepo (e.g. `claude-skills`), create these before the skill files:

**`.claude-plugin/plugin.json`** — plugin identity and version:
```json
{
  "name": "<plugin-name>",
  "description": "<one-line description>",
  "version": "0.1.0",
  "keywords": ["<plugin-name>"]
}
```

**`marketplace.json`** — append an entry to the monorepo's marketplace file. This step is required.

**`.gitignore`** — at minimum:
```
node_modules/
*.env
```

**`README.md`** — skills table, credentials section, install commands.

Confirm the plugin name with the user before creating any files.

## Step 5: Create Skill Directory

```bash
mkdir -p {skill-dir}/{skill-name}
# If complex:
mkdir -p {skill-dir}/{skill-name}/workflows
mkdir -p {skill-dir}/{skill-name}/references
# If needed:
mkdir -p {skill-dir}/{skill-name}/templates  # for output structures
mkdir -p {skill-dir}/{skill-name}/scripts    # for reusable code
```

## Step 6: Write SKILL.md

**Description is the primary trigger.** The body doesn't load until after Claude invokes the skill — so all "when to use" context must be in the `description`, not the body.

```yaml
description: Does X and Y. Use when the user asks about <specific triggers>.
```

**Degrees of freedom** — match specificity to fragility:
- Fragile, order-sensitive operations → specific step-by-step instructions
- Flexible, judgment-based operations → high-level guidance with heuristics

**Simple skill:** Write complete skill file with:
- YAML frontmatter (name, description with triggers)
- `<objective>`
- `<quick_start>`
- Content sections with pure XML
- `<success_criteria>`

**Complex skill:** Write router with:
- YAML frontmatter (description with triggers)
- `<essential_principles>` (inline, unavoidable)
- `<intake>` (question to ask user)
- `<routing>` (maps answers to workflows)
- `<reference_index>` and `<workflows_index>`

## Step 7: Write Workflows (if complex)

For each workflow:
```xml
<required_reading>
Which references to load for this workflow
</required_reading>

<process>
Step-by-step procedure
</process>

<success_criteria>
How to know this workflow is done
</success_criteria>
```

## Step 8: Write References (if needed)

Domain knowledge that:
- Multiple workflows might need
- Doesn't change based on workflow
- Contains patterns, examples, technical details

## Step 9: Validate Structure

Check:
- [ ] YAML frontmatter valid
- [ ] Name matches directory (lowercase-with-hyphens)
- [ ] Description includes what it does AND trigger conditions (third person)
- [ ] No markdown headings (#) in body — use XML tags
- [ ] Required tags present: objective, quick_start, success_criteria
- [ ] All referenced files exist
- [ ] SKILL.md under 500 lines
- [ ] XML tags properly closed
- [ ] Constitutional constraints written for any deterministic/script-owned steps (`Never override`, `Always show`, `Do not skip`)
- [ ] Conversation arc considered: for diagnostic skills, can the agent act on results immediately in the same session?
- [ ] Plugin-level files present if in a monorepo (plugin.json, marketplace.json, .gitignore, README.md)
- [ ] No absolute file paths outside the skill directory itself
- [ ] No hardcoded repo names, usernames, service names, health signals, or trusted user lists
- [ ] Project-specific values live in the plugin's CLAUDE.md, not in skill files
- [ ] Skill reads CLAUDE.md (or equivalent) at runtime for project-specific values

## Step 10: Create Slash Command

```bash
cat > ~/.claude/commands/{skill-name}.md << 'EOF'
---
description: {Brief description}
argument-hint: [{argument hint}]
allowed-tools: Skill({skill-name})
---

Invoke the {skill-name} skill for: $ARGUMENTS
EOF
```

## Step 11: Smoke Test

Invoke the skill and observe:
- Does it ask the right intake question?
- Does it load the right workflow?
- Does the workflow load the right references?
- Does output match expectations?

## Step 12: Rigorous Testing (recommended)

For skills with objectively verifiable outputs, run a full evaluation loop using `workflows/test-and-iterate.md`. This spawns parallel subagents (with-skill vs. baseline), grades assertions, and gives you a clear picture of where the skill helps.

For skills with subjective outputs (writing style, design quality), qualitative review is usually enough.

After the skill is in good shape, consider running `workflows/optimize-description.md` to tune the description for better triggering accuracy.
</process>

<success_criteria>
Skill is complete when:
- [ ] Concrete examples gathered before designing
- [ ] API research done if external service involved
- [ ] Plugin-level files created if in a monorepo (plugin.json, marketplace.json, .gitignore, README.md)
- [ ] Directory structure correct
- [ ] SKILL.md has valid frontmatter with trigger conditions in description
- [ ] Essential principles inline (if complex skill)
- [ ] Intake question routes to correct workflow
- [ ] All workflows have required_reading + process + success_criteria
- [ ] References contain reusable domain knowledge
- [ ] `access` skill included for any API-connected plugin
- [ ] Slash command exists and works
- [ ] Smoke tested with real invocation
- [ ] No hardcoded project-specific values (paths, repo names, service names, health signals, trusted users)
- [ ] (Optional) Rigorous eval loop run via test-and-iterate.md
- [ ] (Optional) Description optimized via optimize-description.md
</success_criteria>
