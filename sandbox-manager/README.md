# sandbox-manager

Lets Claude Code manage its own sandbox — restarting or exiting its own session on remote request, naming/resuming/branching/exporting sessions, and managing its own plugins/marketplaces. More skills will be added here over time.

## Skills

| Skill | Description |
|---|---|
| `restart-session` | Fires automatically when a connected channel (e.g. Telegram) sends `/clear`. Sends `/clear` + Enter to the tmux pane running this Claude Code session. |
| `exit-session` | Fires automatically when a connected channel sends `/exit`. Sends `/exit` + Enter to the tmux pane, ending the process — relies on something outside the pane (a supervisor or restart policy) to bring it back. |
| `rename-session` | Fires on a channel message like `/rename <name>`. Sends `/rename <name>` + Enter to name the current session. |
| `resume-session` | Fires on a channel message like `/resume <name>`. Sends `/resume <name>` + Enter to switch the pane to a different, previously named session. Always requires a name — a bare `/resume` opens an interactive picker that can't be scripted. |
| `branch-session` | Fires automatically when a connected channel sends `/branch`. Sends `/branch` + Enter to fork the conversation at the current point without disturbing the original. |
| `export-session` | Fires on a channel message like `/export <path>` (or bare `/export`). Sends `/export <path>` + Enter to write the conversation to a file; with no path given, defaults to `docs/<slug>` using a summary of the conversation. |
| `background-session` | Fires automatically when a connected channel sends `/background`. Sends `/background` + Enter to hand the current work off to a background agent, freeing the interactive pane. |
| `manage-plugins` | Adds/removes marketplaces and installs/updates/enables/disables/uninstalls plugins via the non-interactive `claude plugin` CLI, then reloads this running session by sending `/reload-plugins` to its own tmux pane. |
| `check-login-expiry` | Fires on a daily `cronjobs`-plugin job (not a channel command). Reads `~/.claude/.credentials.json` and reports over Telegram when this session's login is within its 3-day pre-expiry window — same field and formula the CLI's own "login expires in N days" banner uses, so it needs no tmux scraping and no state file. |

## How it works

All session-control skills assume Claude Code is running as the foreground process of a tmux pane (true for any session started inside `tmux`). Their scripts discover the current pane via `tmux display-message`, verify it's actually running Claude Code, and send the keystrokes — no hardcoded session or pane names. Skills that take user-supplied text (`rename-session`, `resume-session`, `export-session`) send it with `tmux send-keys -l` so it can't be misread as tmux key names. `manage-plugins` does the actual marketplace/plugin changes via the non-interactive `claude plugin ...` CLI (no tmux needed for that part) and only touches the pane for the final `/reload-plugins`, since that command has no CLI equivalent. `check-login-expiry` doesn't touch tmux at all — it's a read-only check over `~/.claude/.credentials.json`, triggered by a cron job rather than the pane.

## Install

```
/plugin install sandbox-manager@claude-skills
/reload-plugins
```

## License

MIT
