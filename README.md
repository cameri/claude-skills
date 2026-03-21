# claude-skills

Monorepo of Claude Code plugins and slash commands by Ricardo Arturo Cabral Mejía.

## Plugins

| Plugin | Description |
|---|---|
| [wallabag](./wallabag/) | Save, search, and manage read-it-later articles via your Wallabag instance |
| [actual-budget](./actual-budget/) | Interact with your self-hosted Actual Budget instance — check balances, add transactions, and query budgets |
| [technitium-dns](./technitium-dns/) | Manage a self-hosted Technitium DNS Server — zones, records, stats, and cache |

## Commands

| Command | Description |
|---|---|
| `/create-skill` | Scaffold a new Claude Code skill plugin from scratch |
| `/dontforget` | Consolidate `remember/` notes into the persistent memory system |
| `/forget` | Triage and prune stale entries from `remember/` |
| `/unsubscribe` | Unsubscribe from a newsletter or mailing list using an unsubscribe URL |

## Setup

### 1. Clone the repo

```bash
git clone git@github.com:cameri/claude-skills.git ~/Workspace/claude-skills
```

### 2. Install slash commands

Copy (or symlink) the commands into your Claude config directory so they are available in every session:

```bash
cp ~/Workspace/claude-skills/commands/*.md ~/.claude/commands/
```

Or as symlinks so changes in the repo are picked up automatically:

```bash
for f in ~/Workspace/claude-skills/commands/*.md; do
  ln -sf "$f" ~/.claude/commands/"$(basename "$f")"
done
```

### 3. Register the plugin marketplace

Run this once inside any Claude Code session:

```
/plugin marketplace add ~/Workspace/claude-skills
```

### 4. Install plugins

```
/plugin install wallabag@claude-skills
/plugin install actual-budget@claude-skills
/plugin install technitium-dns@claude-skills
```

### 5. Reload plugins

```
/reload-plugins
```

After reloading, all plugin skills are available (e.g. `/wallabag:configure`, `/actual-budget:budget`).

## License

Apache-2.0
