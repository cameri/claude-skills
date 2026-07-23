# sandbox-manager

Lets Claude Code manage its own sandbox — restarting its own session on remote request, and managing its own plugins/marketplaces. More skills will be added here over time.

## Skills

| Skill | Description |
|---|---|
| `restart-session` | Fires automatically when a connected channel (e.g. Telegram) sends `/clear`. Sends `/clear` + Enter to the tmux pane running this Claude Code session. |
| `manage-plugins` | Adds/removes marketplaces and installs/updates/enables/disables/uninstalls plugins via the non-interactive `claude plugin` CLI, then reloads this running session by sending `/reload-plugins` to its own tmux pane. |

## How it works

Both skills assume Claude Code is running as the foreground process of a tmux pane (true for any session started inside `tmux`). Their scripts discover the current pane via `tmux display-message`, verify it's actually running Claude Code, and send the keystrokes — no hardcoded session or pane names. `manage-plugins` does the actual marketplace/plugin changes via the non-interactive `claude plugin ...` CLI (no tmux needed for that part) and only touches the pane for the final `/reload-plugins`, since that command has no CLI equivalent.

## Install

```
/plugin install sandbox-manager@claude-skills
/reload-plugins
```

## License

MIT
