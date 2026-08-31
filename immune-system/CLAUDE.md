# immune-system (plugin CLAUDE.md)

Instance-specific values for the immune-system plugin. The skills themselves
stay portable — this file is where the instance's own facts live.

## Operator

- Operator chat: Telegram chat ID `7175022` (Cameri). Alerts go here via
  `mcp__plugin_telegram_telegram__reply`.

## Watch roots

The watcher watches by default:

- `~/.claude/plugins/cache` (Claude Code installed plugins)
- `~/.claude/skills` (Claude Code user skills)
- `~/.claude/hooks` (Claude Code hook binaries)
- `~/.claude/settings.json` (hook registrations — any change to hooks config
  is a finding)
- `~/.omp/plugins/cache/plugins` (omp installed plugins)
- `~/.omp/agent/skills`, `~/.omp/skills` (omp user skills, when present)

Extra roots: add `extraWatchRoots` to
`~/.claude/channels/immune-system/config.json` (absolute paths).

## State

- State + findings: `~/.claude/channels/immune-system/state.json`
- Quarantine: `~/.claude/channels/immune-system/quarantine/<name>-<ts>/`
  with a `META.json` recording originalPath, quarantinedAt, reason, detail,
  hash.
- Override the state dir with `IMMUNE_SYSTEM_STATE_DIR` if this instance
  needs it elsewhere.

## Baseline note

The first sweep after install fingerprints the existing tree without alerting
("nothing is newly installed yet"). Only changes after that baseline notify.
If the baseline was taken while plugins were missing (e.g. first boot before
the marketplace sync), the next sweep legitimately flags the whole set —
review and clear them in a batch; do not quarantine en masse without looking.