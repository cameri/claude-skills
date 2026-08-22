---
name: create-agent-skills
description: Expert guidance for creating, writing, building, and refining Claude Code Skills. Use when working with SKILL.md files, authoring new skills, improving existing skills, or understanding skill structure and best practices. Also reference when updating skills to comply with the Agent Skills specification.
compatibility: Designed for Claude Code and compatible agent environments. Requires understanding of YAML, Markdown, XML structure, and filesystem organization.
metadata:
  author: Anthropic
  purpose: skill-authoring
  version: "1.1"
---

<essential_principles>

<how_skills_work>
Skills are modular, filesystem-based capabilities that provide domain expertise on demand. This skill teaches how to create effective skills.

**1. Skills Are Prompts**
All prompting best practices apply. Be clear, be direct, use XML structure. Assume Claude is smart - only add context Claude doesn't have.

**2. SKILL.md Is Always Loaded**
When a skill is invoked, Claude reads SKILL.md. Use this guarantee:
- Essential principles go in SKILL.md (can't be skipped)
- Workflow-specific content goes in workflows/
- Reusable knowledge goes in references/

**3. Router Pattern for Complex Skills**

```
skill-name/
├── SKILL.md              # Router + principles
├── workflows/            # Step-by-step procedures (FOLLOW)
├── references/           # Domain knowledge (READ)
├── templates/            # Output structures (COPY + FILL)
└── scripts/              # Reusable code (EXECUTE)
```

SKILL.md asks "what do you want to do?" → routes to workflow → workflow specifies which references to read.

**When to use each folder:**
- **workflows/** - Multi-step procedures Claude follows
- **references/** - Domain knowledge Claude reads for context
- **templates/** - Consistent output structures Claude copies and fills (plans, specs, configs)
- **scripts/** - Executable code Claude runs as-is (deploy, setup, API calls)

**4. Pure XML Structure**
No markdown headings (#, ##, ###) in skill body. Use semantic XML tags:
```xml
<objective>...</objective>
<process>...</process>
<success_criteria>...</success_criteria>
```
Keep markdown formatting within content (bold, lists, code blocks).

**5. Progressive Disclosure**
SKILL.md under 500 lines. Split detailed content into reference files. Load only what's needed for the current workflow.

**6. Description Is the Primary Trigger**
The skill body doesn't load until *after* Claude decides to invoke it. All "when to use" context must live in the `description` field — not in the body. If the trigger conditions aren't in the description, the skill won't fire.

**7. Skills Must Be Portable**
Never hardcode project-specific values inside a skill. This includes:
- Absolute file paths (`/workspace/projects/akkadian-agent/`)
- Repo names or usernames (`cameri/akkadian-agent`)
- Container or service names (`akkadian-agent`)
- Health signals, port numbers, or package manager assumptions
- Trusted user lists

Skills that hardcode these values silently break when used in any other context. Adding a new project should never require editing the skill.

Where project-specific values go:
- **Plugin's CLAUDE.md** — values Claude needs to act autonomously (repo map, local paths, trusted principals)
- **Plugin's README.md** — values a human needs to configure (non-critical, informational)

Skills use runtime discovery: read CLAUDE.md at invocation time, inspect the filesystem (`compose.yml`, `package.json`, `pnpm-lock.yaml`), or derive values from the webhook payload. See `references/portability.md` for patterns.
</how_skills_work>

</essential_principles>

<intake>
What would you like to do?

1. Create new skill
2. Audit/modify existing skill
3. Add component (workflow/reference/template/script)
4. Test and iterate on a skill
5. Optimize skill description (improve triggering accuracy)
6. Get guidance

**Wait for response before proceeding.**
</intake>

<routing>
Response → Next Action → Workflow

**Create options (1, "create", "new", "build"):**
- First ask: "Task-execution skill or domain expertise skill?"
- Task-execution → workflows/create-new-skill.md
- Domain expertise → workflows/create-domain-expertise-skill.md

**Audit/Modify options (2, "audit", "modify", "existing"):**
- Ask: "Path to skill?"
- Proceed with appropriate workflow based on task

**Component options (3, "add", "component"):**
- Ask: "Add what? (workflow/reference/template/script)"
- workflow → workflows/add-workflow.md
- reference → workflows/add-reference.md
- template → workflows/add-template.md
- script → workflows/add-script.md

**Test/Iterate options (4, "test", "evaluate", "iterate", "evals"):**
- Proceed directly to workflows/test-and-iterate.md

**Optimize options (5, "optimize", "description", "triggering"):**
- Proceed directly to workflows/optimize-description.md

**Guidance option (6, "guidance", "help"):**
- Proceed to workflows/get-guidance.md

**Intent-based routing (clear intent without menu selection):**
- "audit this skill", "check skill", "review" → workflows/audit-skill.md
- "verify content", "check if current" → workflows/verify-skill.md
- "create domain expertise", "exhaustive knowledge base" → workflows/create-domain-expertise-skill.md
- "create skill for X", "build new skill" → workflows/create-new-skill.md
- "add workflow", "add reference", etc. → workflows/add-{type}.md
- "upgrade to router" → workflows/upgrade-to-router.md
- "test this skill", "run evals", "evaluate results", "iterate" → workflows/test-and-iterate.md
- "optimize description", "improve triggering", "fix triggering" → workflows/optimize-description.md
- "access", "configure access", "authentication", "authorization" → workflows/access.md

**After reading the workflow, follow it exactly.**
</routing>

<quick_reference>

**Simple skill (single file):**
```yaml
---
name: skill-name
description: What it does and when to use it.
---

<objective>What this skill does</objective>
<quick_start>Immediate actionable guidance</quick_start>
<process>Step-by-step procedure</process>
<success_criteria>How to know it worked</success_criteria>
```

**Complex skill (router pattern):**
```
SKILL.md:
  <essential_principles> - Always applies
  <intake> - Question to ask
  <routing> - Maps answers to workflows

workflows/:
  <required_reading> - Which refs to load
  <process> - Steps
  <success_criteria> - Done when...

references/:
  Domain knowledge, patterns, examples

templates/:
  Output structures Claude copies and fills
  (plans, specs, configs, documents)

scripts/:
  Executable code Claude runs as-is
  (deploy, setup, API calls, data processing)
```
</quick_reference>

<reference_index>

**Domain Knowledge** in `references/`:

- **Structure:** recommended-structure.md, skill-structure.md
- **Principles:** core-principles.md, be-clear-and-direct.md, use-xml-tags.md, portability.md
- **Patterns:** common-patterns.md, workflows-and-validation.md
- **Assets:** using-templates.md, using-scripts.md
- **Advanced:** executable-code.md, api-security.md, iteration-and-testing.md
</reference_index>

<workflows_index>

**Workflows** in `workflows/`:

- create-new-skill.md — Build a skill from scratch
- create-domain-expertise-skill.md — Build exhaustive domain knowledge base
- audit-skill.md — Analyze skill against best practices
- verify-skill.md — Check if content is still accurate
- add-workflow.md — Add a workflow to existing skill
- add-reference.md — Add a reference to existing skill
- add-template.md — Add a template to existing skill
- add-script.md — Add a script to existing skill
- upgrade-to-router.md — Convert simple skill to router pattern
- test-and-iterate.md — Run evals with parallel subagents, review results, iterate
- optimize-description.md — Improve triggering accuracy via eval queries
- get-guidance.md — Help decide what kind of skill to build

**Special case: access workflows** for plugin authentication/authorization:
- access.md — Configure plugin access (authentication, authorization, remote URLs)
</workflows_index>

<yaml_requirements>

**YAML Frontmatter Structure**

Required fields:
```yaml
---
name: skill-name          # lowercase-with-hyphens, matches directory
description: ...          # What it does AND when to use it
---
```

Optional fields:
```yaml
license: ...              # License name or reference
compatibility: ...        # Environment/system requirements
metadata:                 # Arbitrary key-value pairs
  key: value
allowed-tools: ...        # Space-separated pre-approved tools
```

Name conventions: `create-*`, `manage-*`, `setup-*`, `generate-*`, `build-*`
</yaml_requirements>

<success_criteria>

A well-structured skill meets these standards:

- **Metadata:** Valid YAML frontmatter with name and description (third person)
- **Structure:** Uses pure XML (no markdown headings in body)
- **Guidance:** Essential principles inline in SKILL.md
- **Organization:** Routes directly to workflows based on user intent
- **Size:** Keeps SKILL.md under 500 lines
- **Clarity:** Minimal clarifying questions, asks only when truly needed
- **Validation:** Tested with real usage
- **Portability:** No hardcoded project-specific values (paths, repo names, service names, trusted users)
- **Configuration:** Project-specific values live in plugin's CLAUDE.md, not in skill files
</success_criteria>
