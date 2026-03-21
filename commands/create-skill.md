# /create-skill

Create a new Claude Code skill plugin inside the `claude-skills` monorepo at `/workspace/projects/claude-skills/`.

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
- **plugin-dir**: `/path/to/claude-skills/<plugin-name>` (resolve the actual repo root from the current working directory or ask the user if unclear)
- **skills**: list of skills needed (always include `configure` for API-connected plugins)
- **channel server needed?** — yes if the plugin receives real-time inbound events from an external source (e.g. incoming messages, network events, webhooks). Channel plugins include a long-running MCP server that pushes `notifications/claude/channel` notifications back to Claude.

For each skill, decide what bundled resources would help:

| Resource | `scripts/` | `references/` | `assets/` |
|---|---|---|---|
| **When** | Code rewritten repeatedly; deterministic operations | API docs, schemas, domain knowledge to load on demand | Templates, boilerplate, static files used in output |

Ask the user to confirm the plugin name and planned skills before creating anything.

---

## Step 3 — Create directory structure

```bash
mkdir -p <plugin-dir>/.claude-plugin
mkdir -p <plugin-dir>/skills/configure
```

No `git init` — the plugin lives inside the existing `claude-skills` git repo.

---

## Step 4 — Create `<plugin-dir>/.claude-plugin/plugin.json`

```json
{
  "name": "<plugin-name>",
  "description": "<one-line description>",
  "version": "0.0.1",
  "keywords": ["<plugin-name>"]
}
```

---

## Step 5 — Update root `marketplace.json`

**This step is required.** Read `/path/to/claude-skills/.claude-plugin/marketplace.json` (same repo root as the plugin-dir),
append the new entry to the `"plugins"` array, and write the file back:

```json
{
  "name": "<plugin-name>",
  "description": "<same one-line description as plugin.json>",
  "category": "productivity",
  "author": {
    "name": "Ricardo Arturo Cabral Mejía",
    "email": "cameri@users.noreply.github.com"
  },
  "source": "./<plugin-name>"
}
```

Use the Read tool to load the current file, then the Edit tool to append the new entry before the closing `]` of the `"plugins"` array. Do not overwrite the existing entries.

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

## Step 6b — (Channel plugins only) Create the MCP channel server

Skip for plain plugins that only respond to user commands.

Three files live at the plugin root and together define the channel server that Claude Code manages automatically:

### `.mcp.json`

Registers the server with Claude Code. Lifecycle (start/stop) is managed automatically — no manual intervention needed.

```json
{
  "mcpServers": {
    "<plugin-name>": {
      "command": "bun",
      "args": ["run", "--cwd", "${CLAUDE_PLUGIN_ROOT}", "--shell=bun", "--silent", "start"]
    }
  }
}
```

### `package.json`

```json
{
  "name": "claude-channel-<plugin-name>",
  "version": "0.0.1",
  "license": "Apache-2.0",
  "type": "module",
  "bin": "./server.ts",
  "scripts": {
    "start": "bun install --no-summary && bun server.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "<external-sdk>": "<version>"
  }
}
```

Replace `<external-sdk>` with the library for the external service (e.g. `nats` for NATS, `grammy` for Telegram, `discord.js` for Discord).

### `server.ts`

A self-contained Bun/TypeScript MCP server. Required structure:

1. **Read config** from `~/.claude/channels/<plugin-name>/.env` at startup.
2. **Create an MCP `Server`** with `capabilities: { tools: {}, experimental: { "claude/channel": {} } }` and an `instructions` string describing available tools and how to interpret channel notifications.
3. **Connect the MCP transport first** (`await mcp.connect(new StdioServerTransport())`) — before connecting to the external service, so no events are lost.
4. **Connect to the external service** and subscribe to inbound events.
5. **Push channel notifications** for each inbound event:
   ```ts
   void mcp.notification({
     method: "notifications/claude/channel",
     params: {
       content: "<human-readable summary for Claude>",
       meta: { source: "<plugin-name>", /* event-specific fields */ },
     },
   });
   ```
6. **Expose MCP tools** (via `ListToolsRequestSchema` / `CallToolRequestSchema`) for outbound actions Claude can take (e.g. send a reply, publish a message).
7. **Graceful shutdown** on `SIGTERM`/`SIGINT`.

Use `nats/server.ts` as the reference implementation. Keep the server in a single file.

**Startup note:** activating a channel plugin requires:
```sh
claude --dangerously-load-development-channels plugin:<plugin-name>@claude-skills
```
This requires interactive approval the first time. Once channels are generally available, `--channels` will replace `--dangerously-load-development-channels`.

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
  /plugin install <plugin-name>@claude-skills
  /reload-plugins
  ```
- For channel plugins, add the startup flag and note:
  ```sh
  claude --dangerously-load-development-channels plugin:<plugin-name>@claude-skills
  ```
  > **Note:** `--dangerously-load-development-channels` requires interactive
  > approval the first time. Once channels are generally available, use
  > `--channels` instead.
- License: Apache-2.0

---

## Step 9 — Initial commit

Stage only the new plugin files and commit inside the `claude-skills` repo:
```bash
git -C /path/to/claude-skills add <plugin-name>/ .claude-plugin/marketplace.json
git -C /path/to/claude-skills commit -m "Add <plugin-name> skill plugin

<one-line description of what the plugin does>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Step 10 — Report and iterate

Tell the user:
- Where the plugin was created and the install commands
- What skills are scaffolded and what to build next

After testing on real tasks, revisit SKILL.md and bundled resources based on what worked and what didn't.
