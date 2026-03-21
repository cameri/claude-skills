# /create-skill

Create a new Claude Code skill plugin from scratch, following the structure documented in `~/.claude/projects/-Users-cameri-Workspace-cameri-notes/remember/claude-skill-plugin-structure.md`.

Arguments passed: `$ARGUMENTS`

`$ARGUMENTS` is a short description of what the skill should do (e.g. "interact with Pocket API" or "manage Todoist tasks"). If no arguments are provided, ask the user what the skill should do before proceeding.

---

## Steps

### 1. Derive names

From `$ARGUMENTS`, derive:
- **plugin-name**: kebab-case, short, noun-based (e.g. `pocket`, `todoist`, `wallabag`)
- **default-dir**: `~/Workspace/<plugin-name>-skill`

Ask the user to confirm the plugin name and directory, or provide alternatives, before creating anything.

### 2. Initialize the git repo

```bash
mkdir -p <dir>/.claude-plugin
mkdir -p <dir>/skills/configure
cd <dir>
git init
```

### 3. Create `.claude-plugin/plugin.json`

```json
{
  "name": "<plugin-name>",
  "description": "<one-line description derived from $ARGUMENTS>",
  "version": "0.0.1",
  "keywords": ["<plugin-name>"]
}
```

### 4. Create `.claude-plugin/marketplace.json`

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

### 5. Create `skills/configure/SKILL.md`

Generate a `configure` skill appropriate for the plugin. A configure skill should:
- Store credentials or connection settings in `~/.claude/channels/<plugin-name>/${ENV}.env`
  where `ENV` defaults to `""` (empty string), making the default file `~/.claude/channels/<plugin-name>/.env`
- Accept `env=<name>` as an argument; when omitted, use `""` (empty string) so the file resolves to `.env`
- When `ENV` is empty, display the environment as "(default)" and omit `env=` from suggested commands
- When listing available environments, match `*.env` files; display `.env` as "(default)"
- Support: no-args status check (shows active env + available envs), guided `setup` subcommand,
  explicit `key=value` save, `clear` (env-scoped), and `clear <key>`
- Test the connection after saving if an API endpoint is available
- `chmod 600` the `${ENV}.env` after writing
- Single-quote credential values in the env file (e.g. `PASSWORD='...'`) to prevent shell expansion of
  special characters (`$`, `#`, `@`, etc.) when the file is sourced

Use the wallabag configure skill as a reference pattern. Tailor the credential keys and connection test to the specific service described in `$ARGUMENTS`.
- Use `http` (httpie) for all HTTP calls, not `curl`. Always pass `--ignore-stdin` to prevent blocking. Use `-b` flag for body-only output when parsing responses.

### 6. Create `.gitignore`

```
node_modules/
*.env
```

### 7. Create `README.md`

Include:
- What the plugin does
- Skills table (name + one-line description)
- Credentials section (what keys are needed and where to find them); note that named environments
  are stored as `<env>.env` alongside the default `.env`
- Install commands:
  ```
  /plugin marketplace add <dir>
  /plugin install <plugin-name>@<plugin-name>
  /reload-plugins
  ```
- License: Apache-2.0

### 8. Initial commit

Stage all files and commit:
```
Initial scaffold for <plugin-name> Claude Code plugin

<one-line description of what the plugin does>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

### 9. Report

Tell the user:
- Where the plugin was created
- The install commands to load it into Claude
- What skills are available and what to build next
