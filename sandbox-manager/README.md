# sandbox-manager

Lets Claude Code manage its own sandbox — starting with restarting its own session on remote request. More skills (e.g. installing plugins) will be added here over time.

## Skills

| Skill | Description |
|---|---|
| `restart-session` | Fires automatically when a connected channel (e.g. Telegram) sends `/clear`. Sends `/clear` + Enter to the tmux pane running this Claude Code session. |

## How it works

The skill assumes Claude Code is running as the foreground process of a tmux pane (true for any session started inside `tmux`). `scripts/restart-session.sh` discovers the current pane via `tmux display-message`, verifies it's actually running Claude Code, and sends the keystrokes — no hardcoded session or pane names.

## Install

```
/plugin install sandbox-manager@claude-skills
/reload-plugins
```

## License

MIT
