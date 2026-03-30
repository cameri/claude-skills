# claude-skills

Monorepo of Claude Code plugins and slash commands by Ricardo Arturo Cabral Mejía.

## Plugins

| Plugin | Description |
|---|---|
| [actual-budget](./actual-budget/) | Interact with your self-hosted Actual Budget instance — check balances, add transactions, and query budgets |
| [elevenlabs](./elevenlabs/) | Generate speech, transcribe audio, create music and sound effects, and build voice agents using the ElevenLabs API |
| [github-manager](./github-manager/) | Autonomous GitHub repository manager — handles webhook events for issues, PRs, discussions, CI failures, and security alerts |
| [nats](./nats/) | Connect Claude Code agents over NATS — discover agents, expose capabilities as services, and invoke them point-to-point or broadcast |
| [paperless](./paperless/) | Upload documents to and search a Paperless-ngx instance via its REST API |
| [scheduler](./scheduler/) | Schedule tasks using natural language — 'every 3 minutes', 'every weekday at 9am', 'once in 5 minutes' |
| [technitium-dns](./technitium-dns/) | Manage a self-hosted Technitium DNS Server — zones, records, stats, and cache |
| [wallabag](./wallabag/) | Save, search, and manage read-it-later articles via your Wallabag instance |
| [webhooks](./webhooks/) | Receive webhook events from external systems as channel notifications — HMAC-SHA256, IP allowlisting, BullMQ processing |

### actual-budget

| Skill | Description |
|---|---|
| `/actual-budget:configure` | Set up Actual Budget credentials — save the server URL and password |
| `/actual-budget:budget` | Query accounts, check balances, view recent transactions, and trigger bank sync |
| `/actual-budget:add-transaction` | Add a transaction — spending, income, or any financial event |

### github-manager

| Skill | Description |
|---|---|
| `github-manager:manage-issues` | Handles GitHub issue events; triages labels, prompts for details, escalates external issues via Telegram |
| `github-manager:manage-pull-requests` | Handles GitHub PR events; auto-merges Dependabot patches, escalates external PRs via Telegram |
| `github-manager:manage-discussions` | Handles GitHub discussion events; silently monitors trusted users, escalates external discussions via Telegram |
| `github-manager:manage-ci` | Handles GitHub CI events; alerts on failures via Telegram |
| `github-manager:manage-projects` | Handles GitHub Projects v2 events; notifies on lifecycle changes, escalates external activity via Telegram |
| `github-manager:manage-admin` | Handles GitHub security alerts, collaborator changes, pushes, and admin events |

### elevenlabs

| Skill | Description |
|---|---|
| `elevenlabs:text-to-speech` | Convert text to speech in 70+ languages using ElevenLabs voice AI |
| `elevenlabs:speech-to-text` | Transcribe audio/video to text using ElevenLabs Scribe v2 |
| `elevenlabs:agents` | Build real-time voice AI agents and assistants |
| `elevenlabs:music` | Generate instrumental tracks, songs, and background music from prompts |
| `elevenlabs:sound-effects` | Generate sound effects, ambient sounds, and audio textures from text |
| `elevenlabs:setup-api-key` | Configure an ElevenLabs API key (ELEVENLABS_API_KEY) |
| `elevenlabs:elevenlabs-transcribe` | Batch or realtime audio transcription via CLI scripts |

### nats

| Skill | Description |
|---|---|
| `/nats:configure` | Configure the NATS server URL for agent communication |
| `/nats:status` | Show connection info and all discovered agents with their capabilities |
| `/nats:discover` | Discover all agents on the NATS network and list their capabilities |
| `/nats:call` | Invoke a capability on a specific agent by agent ID |
| `/nats:broadcast` | Broadcast a capability invocation to all agents and collect responses |
| `/nats:message` | Send a free-form message directly to another agent |

### paperless

| Skill | Description |
|---|---|
| `/paperless:configure` | Save the instance URL, username, and password; verify connection |
| `/paperless:search` | Full-text search, similarity search, or autocomplete |
| `/paperless:upload` | Upload a local file with optional metadata |
| `/paperless:content` | Display the full OCR-extracted text of a document by ID |
| `/paperless:view` | Download the archived PDF; when called from Telegram, sends the file to chat |

### scheduler

| Skill | Description |
|---|---|
| `/scheduler:schedule` | Schedule a task using natural language; fires channel notifications when due |

### technitium-dns

| Skill | Description |
|---|---|
| `/technitium-dns:configure` | Save the server URL and API token (or username/password) |
| `/technitium-dns:query` | Query DNS stats — top clients, top domains, query counts, cache info |
| `/technitium-dns:zone` | List, create, delete, enable, or disable DNS zones |
| `/technitium-dns:record` | Add, list, update, or delete A, AAAA, CNAME, MX, TXT, SRV records |

### wallabag

| Skill | Description |
|---|---|
| `/wallabag:configure` | Save the instance URL and OAuth credentials |
| `/wallabag:save` | Save a URL to Wallabag to read later |

### webhooks

| Skill | Description |
|---|---|
| `webhooks:receive-webhooks` | Configure webhook endpoints (add/edit/remove/list), set auth mode, manage IP allowlists, and react to inbound events |

## Commands

| Command | Description |
|---|---|
| `/create-skill` | Scaffold a new Claude Code skill plugin from scratch |
| `/dontforget` | Consolidate `remember/` notes into the persistent memory system |
| `/forget` | Triage and prune stale entries from `remember/` |
| `/unsubscribe` | Unsubscribe from a newsletter or mailing list using an unsubscribe URL |
| `/unfurl` | Resolve a minified or tracking URL to its final destination |

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
/plugin install actual-budget@claude-skills
/plugin install elevenlabs@claude-skills
/plugin install github-manager@claude-skills
/plugin install nats@claude-skills
/plugin install paperless@claude-skills
/plugin install scheduler@claude-skills
/plugin install technitium-dns@claude-skills
/plugin install wallabag@claude-skills
```

### 5. Reload plugins

```
/reload-plugins
```

After reloading, all plugin skills are available (e.g. `/paperless:configure`, `/actual-budget:budget`).

## License

Apache-2.0
