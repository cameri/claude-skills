---
name: restart-session
description: Restarts the current Claude Code session by sending /clear followed by Enter to the tmux pane it runs in. Fires when a connected channel (e.g. Telegram) sends a message that is exactly /clear, asking to restart, reset, or clear the current session.
user-invocable: false
allowed-tools:
  - Bash
  - mcp__plugin_telegram_telegram__reply
---

<essential_principles>
This clears the conversation of whoever is currently talking to this session — irreversible for that context (auto-memory under `~/.claude/projects/*/memory/` persists independently and is unaffected). Only act on a `/clear` message from a channel that already trusts the sender via its own access control (e.g. Telegram pairing/allowlist) — this skill does not re-authenticate the sender itself.

The queued `/clear` only takes effect once this turn ends and Claude Code reads from the pane's stdin again. That means any tool call issued earlier in this same turn — including a channel reply — still completes normally before the reset happens.
</essential_principles>

<objective>
Restarts this Claude Code session on remote request. The running process shares its tmux pane's stdin, so typing "/clear" and pressing Enter into that pane resets the interactive session exactly as if the user had typed it themselves at the terminal.
</objective>

<quick_start>
Run the bundled script exactly as written — do not substitute a hand-written `tmux` command, since it validates the target pane before sending keys:

```bash
bash scripts/restart-session.sh
```
</quick_start>

<workflow>
1. Confirm the inbound channel message is `/clear` (case-sensitive, no extra text) — anything else is not this skill's trigger.
2. Acknowledge on the originating channel (e.g. a short Telegram reply like "Restarting now.") — this still reaches the user, since the reset only fires after this turn ends.
3. Run `scripts/restart-session.sh`. It auto-discovers the current tmux pane, refuses to fire if the pane isn't running Claude Code, then sends `/clear` + Enter.
4. End the turn without further tool calls — anything queued after this point is discarded by the reset anyway.
</workflow>

<success_criteria>
Script exits 0 and prints `Sent /clear to pane <id>`. If it exits non-zero (not in tmux, or pane running something unexpected), report the error on the channel instead of retrying with a modified command.
</success_criteria>
