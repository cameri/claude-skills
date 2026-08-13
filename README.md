# claude-skills

Monorepo of Claude Code plugins and slash commands by Ricardo Arturo Cabral Mejía.

## Plugins

| Plugin | Description |
|---|---|
| [actual-budget](./actual-budget/) | Interact with your self-hosted Actual Budget instance — check balances, add transactions, and query budgets |
| [autoresearch](./autoresearch/) | Autonomously optimize Claude Code skills using Karpathy's autoresearch methodology — binary evals, prompt mutation, and iterative improvement loops |
| [cronjobs](./cronjobs/) | Schedule recurring or one-time jobs using natural language — 'every 3 minutes', 'every weekday at 9am', 'once in 5 minutes' |
| [docker-maintenance](./docker-maintenance/) | Maintain Docker Compose services and custom images — update base images, pin sha256 digests, manage Containerfile/Dockerfile dependencies, test builds, and log all changes |
| [elevenlabs](./elevenlabs/) | Generate speech, transcribe audio, create music and sound effects, and build voice agents using the ElevenLabs API |
| [executable-skepticism](./executable-skepticism/) | Verification protocol that turns a theory, paper, model, or confident quantitative claim into a falsifiable, runnable test instead of a debate in prose |
| [finance-manager](./finance-manager/) | Reconcile bank statements against ActualBudget, run household financial reviews (net worth, goal tracking, optimization), look up Bitcoin transactions/addresses/wallet descriptors via mempool.space, and onboard or manage the plugin's tracked accounts, wallets, and periodic sync jobs |
| [github-manager](./github-manager/) | Autonomous GitHub repository manager — handles webhook events for issues, PRs, discussions, CI failures, and security alerts |
| [home-assistant](./home-assistant/) | Interact with Home Assistant via the REST API — get entity states, call services, fire events, render Jinja2 templates, and query state history |
| [jj](./jj/) | Jujutsu (jj) version control system skill — stack-based workflows, change curation, and jj best practices for Git-compatible VCS |
| [journal](./journal/) | Keeps a series of narrative journals about what you've been doing, written from Claude's own perspective, by reading session history and memory |
| [nats](./nats/) | Connect Claude Code agents over NATS — discover agents, expose capabilities as services, and invoke them point-to-point or broadcast |
| [nostr](./nostr/) | Nostr channel for Claude Code — decentralized messaging over Nostr relays with DM pairing, allowlists, relay pool management, and NIP-04 encrypted DMs |
| [paperless](./paperless/) | Upload documents to and search a Paperless-ngx instance via its REST API |
| [sandbox-manager](./sandbox-manager/) | Manage the Claude Code sandbox itself — restart sessions and (soon) install plugins — by driving its own tmux pane |
| [simple-english](./simple-english/) | Write or rewrite technical text with the rules of ASD-STE100 Simplified Technical English so it is clear, unambiguous, and free of AI slop |
| [technitium-dns](./technitium-dns/) | Manage a self-hosted Technitium DNS Server — zones, records, stats, and cache |
| [telegram](./telegram/) | Telegram channel for Claude Code — messaging bridge with built-in access control, pairing, and full Bot API coverage including voice note transcription |
| [telegram-ng](./telegram-ng/) | Telegram channel for Claude Code — messaging bridge with built-in access control. Fork of Anthropic's official telegram plugin for local development |
| [wallabag](./wallabag/) | Save, search, and manage read-it-later articles via your Wallabag instance |
| [webhooks](./webhooks/) | Receive webhook events from external systems as channel notifications — HMAC-SHA256, IP allowlisting, BullMQ processing |

### actual-budget

| Skill | Description |
|---|---|
| `/actual-budget:configure` | Set up Actual Budget credentials — save the server URL and password |
| `/actual-budget:budget` | Query accounts, check balances, view recent transactions, and trigger bank sync |
| `/actual-budget:add-transaction` | Add a transaction — spending, income, or any financial event |

### finance-manager

| Skill | Description |
|---|---|
| `/finance-manager:setup` | Onboard the plugin for first use (household, accounts, hot/cold wallets, ownership, connecting Actual Budget/Paperless-ngx) or review/add/remove tracked entries and periodic sync jobs |
| `/finance-manager:reconcile-statement` | Reconcile a bank statement against ActualBudget — syncs accounts, matches transactions, self-improves reconciliation rules |
| `/finance-manager:paperless-workflows` | Create or fix Paperless-ngx workflows so bank statement documents auto-tag correctly |
| `/finance-manager:query-mempool` | Look up Bitcoin transactions, addresses, and wallet descriptor (single-sig or multisig) balances/history via the mempool.space API |
| `/finance-manager:review-finances` | Run a household financial review — execution audit, net worth/liquidity check, tax/expense optimization scan, and a single-sitting report with goal tracking and up to 3 next actions |

### github-manager

| Skill | Description |
|---|---|
| `github-manager:manage-issues` | Handles GitHub issue events; triages labels, prompts for details, escalates external issues via Telegram |
| `github-manager:manage-pull-requests` | Handles GitHub PR events; auto-merges Dependabot patches, escalates external PRs via Telegram |
| `github-manager:manage-discussions` | Handles GitHub discussion events; silently monitors trusted users, escalates external discussions via Telegram |
| `github-manager:manage-ci` | Handles GitHub CI events; alerts on failures via Telegram |
| `github-manager:manage-projects` | Handles GitHub Projects v2 events; notifies on lifecycle changes, escalates external activity via Telegram |
| `github-manager:manage-admin` | Handles GitHub security alerts, collaborator changes, pushes, and admin events |

### journal

| Skill | Description |
|---|---|
| `journal:update-journal` | Reads session activity since the last update across every project on this machine plus the memory system, judges whether it continues the current journal's cycle or starts a new one, and writes/closes entries accordingly |

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

### executable-skepticism

| Skill | Description |
|---|---|
| `executable-skepticism:executable-skepticism` | Operationalize a claim, register numeric predictions before running any code, execute deterministically, then score every prediction pass/fail — failures first, derived-vs-installed called out |

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

### sandbox-manager

| Skill | Description |
|---|---|
| `sandbox-manager:restart-session` | Fires automatically on a `/clear` channel message; sends `/clear` + Enter to the tmux pane running this Claude Code session |

### cronjobs

| Skill | Description |
|---|---|
| `/cronjobs:cronjob` | Schedule a recurring or one-time job using natural language; fires channel notifications when due |

### simple-english

| Skill | Description |
|---|---|
| `simple-english:simple-english` | Write or rewrite technical text per ASD-STE100 — classifies procedural vs. descriptive, applies the 53-rule catalog, runs a mandatory self-check before delivering |

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

### autoresearch

| Skill | Description |
|---|---|
| `/autoresearch:optimize-skill` | Improve a SKILL.md using binary evals and iterative prompt mutation — use when a skill has reliability issues or produces inconsistent results |

### docker-maintenance

| Skill | Description |
|---|---|
| `/docker-maintenance:docker-maintenance` | Update Docker base images with sha256 pinning, manage Containerfile dependencies, test builds, and keep an audit log |

### home-assistant

| Skill | Description |
|---|---|
| `/home-assistant:access` | Configure Home Assistant credentials — save the server URL and long-lived access token |
| `/home-assistant:get-state` | Get the current state of one or all entities |
| `/home-assistant:set-state` | Create or update the state of an entity |
| `/home-assistant:call-service` | Call a service to control devices or trigger automations |
| `/home-assistant:fire-event` | Fire a custom event to trigger event-driven automations |
| `/home-assistant:query-history` | Query state history or logbook for one or more entities |
| `/home-assistant:render-template` | Render and debug a Jinja2 template |

### jj

| Skill | Description |
|---|---|
| `jj:working-with-jj` | Use Jujutsu (jj) instead of git for all version control operations in this workspace — commits, history, branching, pushing |

### nostr

| Skill | Description |
|---|---|
| `nostr:nostr` | Handle inbound Nostr DMs, send replies, publish notes, fetch events, and check relay status |
| `/nostr:configure` | Set up the Nostr channel — save the nsec, manage relays, configure subscribed event kinds |
| `/nostr:access` | Manage Nostr channel access — pairings, allowlists, policy |
| `/nostr:profile` | View or update the Nostr profile (kind:0 metadata) |
| `/nostr:relay-list` | Manage the NIP-65 relay list for this identity |
| `/nostr:fetch-event` | Fetch a Nostr event by ID or filter |
| `/nostr:verify-event` | Verify an event's schema, ID hash, and Schnorr signature |
| `/nostr:react` | React to an event with a NIP-25 reaction |
| `/nostr:bech32` | Encode/decode NIP-19 bech32 entities (note1, npub1, nevent1, etc.) |
| `/nostr:mine-pubkey` | Mine a vanity or proof-of-work Nostr keypair with rana |

### telegram

| Skill | Description |
|---|---|
| `telegram:telegram` | Handle inbound Telegram messages, send replies, react, edit messages, download attachments, process voice notes |
| `/telegram:configure` | Save the bot token and review access policy |
| `/telegram:access` | Manage Telegram channel access — pairings, allowlists, DM/group policy |

### telegram-ng

Fork of Anthropic's official `telegram` plugin — see [telegram-ng/README.md](./telegram-ng/README.md). Not yet the live driver for this workspace; `telegram` above remains active pending cutover.

| Skill | Description |
|---|---|
| `/telegram-ng:configure` | Save the bot token and review access policy |
| `/telegram-ng:access` | Manage Telegram channel access — pairings, allowlists, DM/group policy |

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

## Alternative: install via `npx skills`

[vercel-labs/skills](https://github.com/vercel-labs/skills) is a separate community CLI that installs Claude Code skills straight from a GitHub repo, without registering a plugin marketplace. It works against this repo too.

Install every skill in this repo:

```bash
npx skills add cameri/claude-skills
```

Install a specific plugin's skill directly (skills live at `<plugin>/skills/<skill-name>`):

```bash
npx skills add https://github.com/cameri/claude-skills/tree/main/actual-budget/skills/access
```

Or pick skills by name out of the whole repo:

```bash
npx skills add cameri/claude-skills -s access query-budget add-transaction
```

Useful flags: `--list` to see what's available before installing, `-g`/`--global` to install to your user directory instead of the current project, `--copy` to copy files instead of symlinking, and `-a claude-code` to target Claude Code if you have other supported agents installed. You can also run a skill without installing it:

```bash
npx skills use cameri/claude-skills --skill access --agent claude-code
```

See the [vercel-labs/skills README](https://github.com/vercel-labs/skills) for the full command reference (`list`, `find`, `update`, `remove`, `init`).

## License

MIT
