---
name: exit-session
description: Exits the current Claude Code session by sending /exit followed by Enter to the tmux pane it runs in. Fires when a connected channel (e.g. Telegram) sends a message that is exactly /exit, or explicitly asks for a hard restart (as opposed to /clear's soft reset).
user-invocable: false
allowed-tools:
  - Bash
  - mcp__plugin_telegram_telegram__reply
---

<essential_principles>
This terminates the Claude Code process entirely — unlike [[restart-session]]'s `/clear`, nothing is left running in the pane afterward. Only fire this from a channel message that already trusts the sender via its own access control (e.g. Telegram pairing/allowlist) — this skill does not re-authenticate the sender itself.

This only makes sense to use if something outside the pane brings Claude back up after it exits (a process supervisor, a container restart policy, a wrapper loop). Before using this skill in a new deployment, confirm such a supervisor exists — otherwise `/exit` just ends the session with nothing to revive it. If unsure, ask rather than assume.

The queued `/exit` only takes effect once this turn ends and Claude Code reads from the pane's stdin again — same timing as [[restart-session]]'s `/clear`. Any tool call issued earlier in this same turn, including a channel reply, still completes normally before the exit happens.
</essential_principles>

<objective>
Exits this Claude Code session on remote request, for cases where a full process restart is needed rather than just clearing the conversation (e.g. recovering from a stuck state, or picking up a config change that only applies at startup).
</objective>

<quick_start>
Run the bundled script exactly as written — do not substitute a hand-written `tmux` command, since it validates the target pane before sending keys:

```bash
bash scripts/exit-session.sh
```
</quick_start>

<workflow>
1. Confirm the inbound channel message is `/exit` (case-sensitive, no extra text), or another clear, explicit request for a hard restart rather than a `/clear`-style reset — anything else is not this skill's trigger.
2. Acknowledge on the originating channel (e.g. a short Telegram reply like "Exiting now — should come back up shortly.") — this still reaches the user, since the exit only fires after this turn ends.
3. Run `scripts/exit-session.sh`. It auto-discovers the current tmux pane, refuses to fire if the pane isn't running Claude Code, then sends `/exit` + Enter.
4. End the turn without further tool calls — anything queued after this point is discarded once the process exits anyway.
</workflow>

<success_criteria>
Script exits 0 and prints `Sent /exit to pane <id>`. If it exits non-zero (not in tmux, or pane running something unexpected), report the error on the channel instead of retrying with a modified command.
</success_criteria>
