# /create-skill

Create a new Claude Code skill plugin from scratch.

Arguments passed: `$ARGUMENTS`

`$ARGUMENTS` is a short description of what the plugin should do (e.g. "interact with Pocket API"). If empty, ask the user what it should do before proceeding.

---

## Step 1 — Understand with concrete examples

Before writing anything, gather enough context to design effectively. Ask focused questions (avoid asking too many at once):

- "What would a user say to trigger this skill? Give me 2–3 example requests."
- "What operations does it need to perform?" (read-only queries, writes, auth flows, etc.)
- "Does it call an external API or service? If so, which one and how is it authenticated?"

Follow up as needed. Conclude when you have a clear picture of the usage patterns, triggers, and operations.

---

## Step 2 — Plan the plugin

From `$ARGUMENTS` and the concrete examples, derive:

- **plugin-name**: kebab-case, short, noun-based (e.g. `pocket`, `todoist`, `wallabag`)
- **default-dir**: `~/Workspace/<plugin-name>-skill`
- **skills**: list of skills needed (always include `configure` for API-connected plugins)

For each skill, decide what bundled resources would help:

| Resource | `scripts/` | `references/` | `assets/` |
|---|---|---|---|
| **When** | Code rewritten repeatedly; deterministic operations | API docs, schemas, domain knowledge to load on demand | Templates, boilerplate, static files used in output |

Ask the user to confirm the plugin name, directory, and planned skills before creating anything.

---

## Step 3 — Initialize the git repo

```bash
mkdir -p <dir>/.claude-plugin
mkdir -p <dir>/skills/configure
cd <dir>
git init
```

---

## Step 4 — Create `.claude-plugin/plugin.json`

```json
{
  "name": "<plugin-name>",
  "description": "<one-line description>",
  "version": "0.0.1",
  "keywords": ["<plugin-name>"]
}
```

---

## Step 5 — Create `.claude-plugin/marketplace.json`

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "<plugin-name>",
  "description": "Local marketplace for the <plugin-name> Claude Code plugin.",
  "owner": {
    "name": "Ricardo Arturo Cabral Mejía",
    "email": "cameri@users.noreply.github.com"
  },
  "plugins": [
    {
      "name": "<plugin-name>",
      "description": "<same one-line description as plugin.json>",
      "category": "productivity",
      "author": {
        "name": "Ricardo Arturo Cabral Mejía",
        "email": "cameri@users.noreply.github.com"
      },
      "source": "./"
    }
  ]
}
```

---

## Step 6 — Create skill files

Each skill lives in `skills/<skill-name>/` and may contain:

```
skills/<skill-name>/
├── SKILL.md          (required)
├── scripts/          (optional — executable code)
├── references/       (optional — docs/schemas loaded on demand)
└── assets/           (optional — templates/files used in output)
```

Do **not** create README, CHANGELOG, or other auxiliary files inside skill directories.

### Writing each SKILL.md

**Frontmatter** — `description` is the primary trigger mechanism. Include both what the skill does *and* when to use it (with concrete triggers). All "when to use" context must be in the description — not in the body (the body only loads after triggering).

```yaml
---
name: <skill-name>
description: <what it does>. Use when <specific triggers and contexts>.
user-invocable: true
allowed-tools:
  - Read
  - Bash(<safe-commands> *)
---
```

**Body** — Instructions Claude needs that it doesn't already know. Keep under 500 lines. Prefer concise examples over verbose explanation. Write in imperative form. Move detailed reference material (API schemas, long docs) to `references/` files and link them explicitly from SKILL.md so Claude knows they exist and when to read them.

**Degrees of freedom** — match specificity to fragility:
- Fragile, order-sensitive operations → specific step-by-step instructions
- Flexible, judgment-based operations → high-level guidance with heuristics

### `configure` skill

For any API-connected plugin, create `skills/configure/SKILL.md` following this pattern:

- Credential file: `~/.claude/channels/<plugin-name>/${ENV}.env`
  - `ENV` defaults to `""` (empty string) → file resolves to `.env` (backwards compatible)
  - Named envs: `env=production` → `production.env`
  - Display `ENV=""` as "(default)"; omit `env=` from suggestions when ENV is empty
- Support: no-args status (shows active env + lists all `*.env` files, `.env` shown as "(default)"), `setup` walkthrough, explicit `key=value` save, `clear` (env-scoped), `clear <key>`
- After saving: test the connection, `chmod 600` the file
- Single-quote credential values (e.g. `PASSWORD='...'`) to handle `$`, `#`, `@`, etc.
- HTTP calls: use `http` (httpie), always `--ignore-stdin`, use `-b` for body-only output

---

## Step 7 — Create `.gitignore`

```
node_modules/
*.env
```

---

## Step 8 — Create `README.md`

Plugin-level user-facing documentation. Include:
- What the plugin does
- Skills table (name + one-line description)
- Credentials section (keys needed, where to find them; mention named envs stored as `<env>.env`)
- Install commands:
  ```
  /plugin marketplace add <dir>
  /plugin install <plugin-name>@<plugin-name>
  /reload-plugins
  ```
- License: Apache-2.0

---

## Step 9 — Initial commit

Stage all files and commit:
```
Initial scaffold for <plugin-name> Claude Code plugin

<one-line description of what the plugin does>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## Step 10 — Report and iterate

Tell the user:
- Where the plugin was created and the install commands
- What skills are scaffolded and what to build next

After testing on real tasks, revisit SKILL.md and bundled resources based on what worked and what didn't.
