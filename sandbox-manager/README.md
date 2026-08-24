# sandbox-manager

Lets Claude Code manage its own sandbox — restarting or exiting its own session on remote request, naming/resuming/branching/exporting sessions, and managing its own plugins/marketplaces. More skills will be added here over time.

## Skills

| Skill | Description |
|---|---|
| `restart-session` | Fires automatically when a connected channel (e.g. Telegram) sends `/clear`. Sends `/clear` + Enter to the pane (tmux or herdr) running this Claude Code session. |
| `exit-session` | Fires automatically when a connected channel sends `/exit`. Sends `/exit` + Enter to the pane, ending the process (on herdr, also explicitly stops the herdr session — herdr doesn't tear one down on its own) — relies on something outside the pane (a supervisor or restart policy) to bring it back. |
| `rename-session` | Fires on a channel message like `/rename <name>`. Sends `/rename <name>` + Enter to name the current session. |
| `resume-session` | Fires on a channel message like `/resume <name>`. Sends `/resume <name>` + Enter to switch the pane to a different, previously named session. Always requires a name — a bare `/resume` opens an interactive picker that can't be scripted. |
| `branch-session` | Fires automatically when a connected channel sends `/branch`. Sends `/branch` + Enter to fork the conversation at the current point without disturbing the original. |
| `export-session` | Fires on a channel message like `/export <path>` (or bare `/export`). Sends `/export <path>` + Enter to write the conversation to a file; with no path given, defaults to `docs/<slug>` using a summary of the conversation. |
| `background-session` | Fires automatically when a connected channel sends `/background`. Sends `/background` + Enter to hand the current work off to a background agent, freeing the interactive pane. |
| `manage-plugins` | Adds/removes marketplaces and installs/updates/enables/disables/uninstalls plugins via the non-interactive `claude plugin` CLI, then reloads this running session by sending `/reload-plugins` to its own pane (tmux or herdr). |
| `check-login-expiry` | Fires on a daily `cronjobs`-plugin job (not a channel command). Reads `~/.claude/.credentials.json` and reports over Telegram when this session's login is within its 3-day pre-expiry window — same field and formula the CLI's own "login expires in N days" banner uses, so it needs no pane scraping and no state file. |
| `setup-hooks` | Explicit user request ("set up hooks", "install the usage-alert hook", etc.). Installs a curated set of 7 hook scripts (a destructive-`rm` guard, a channel-reply-enforcement Stop hook, usage-threshold Telegram alerts, an idle-state tracker, a session handoff-doc reader, a new-session Telegram notifier, and a statusline usage-cache wrapper) into `~/.claude/settings.json`, idempotently. Bundled scripts carry no secrets or hardcoded personal paths — chat ID, bot-token `.env` path, timezone, and handoff-doc path are gathered from the user at install time and stored separately in `~/.claude/channels/sandbox-manager/hooks-config.json` (mode 600). |
| `whats-next` | User request to save progress, prepare for a restart, or write a handoff. Writes a comprehensive `whats-next.md` handoff document (Original Task, Work Completed, Work Remaining, Attempted Approaches, Critical Context, Current State) so work can resume with zero information loss — the same format the `setup-hooks`-installed `whats-next-check` hook reads on the next session start. |
| `add-to-todos` | User request to park, defer, or add something to the todo list. Appends a self-contained entry to `TO-DOS.md` (Problem/Files/Solution fields), checking for near-duplicates first, then offers to resume the original work. |
| `check-todos` | User request to see what's outstanding or pick up parked work. Lists `TO-DOS.md` entries as a numbered list, loads full context for the one picked, checks for a matching skill/workflow, and removes the entry once work begins. |

## How it works

All session-control skills assume Claude Code is running as the foreground process of a terminal-multiplexer pane, and work the same whether that multiplexer is `tmux` or `herdr` — the shared `lib/pane-io.sh` detects which one is active at runtime (via `$TMUX`/`$HERDR_ENV`, mutually exclusive per container) and dispatches accordingly. Their scripts discover the current pane, verify it's actually running Claude Code, and send the keystrokes — no hardcoded session or pane names. Skills that take user-supplied text (`rename-session`, `resume-session`, `export-session`) send it literally (`tmux send-keys -l` / `herdr pane run`) so it can't be misread as multiplexer key names. `manage-plugins` does the actual marketplace/plugin changes via the non-interactive `claude plugin ...` CLI (no pane needed for that part) and only touches the pane for the final `/reload-plugins`, since that command has no CLI equivalent. `check-login-expiry` doesn't touch the pane at all — it's a read-only check over `~/.claude/.credentials.json`, triggered by a cron job rather than the pane. `setup-hooks` doesn't touch the pane either — it copies its bundled hook scripts into `~/.claude/hooks/` and merges their registration into `~/.claude/settings.json` via `scripts/install-hooks.py`, which is safe to re-run (it skips any hook whose command is already registered).

## Install

```
/plugin install sandbox-manager@claude-skills
/reload-plugins
```

## License

MIT
