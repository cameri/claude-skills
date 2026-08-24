---
name: exit-session
description: Exits the current Claude Code session by sending /exit followed by Enter to the pane it runs in (tmux or herdr). Fires when a connected channel (e.g. Telegram) sends a message that is exactly /exit, or explicitly asks for a hard restart (as opposed to /clear's soft reset).
user-invocable: false
allowed-tools:
  - Bash
  - ListAgents
  - mcp__plugin_telegram_telegram__reply
---

<essential_principles>
This terminates the Claude Code process entirely — unlike [[restart-session]]'s `/clear`, nothing is left running in the pane afterward. Only fire this from a channel message that already trusts the sender via its own access control (e.g. Telegram pairing/allowlist) — this skill does not re-authenticate the sender itself.

On herdr specifically, sending `/exit` alone isn't enough: unlike tmux, herdr does not tear a session down just because its pane's foreground process exited — it silently opens a fresh shell in the same pane instead (verified live against herdr 0.8.0). The bundled script accounts for this by also running `herdr session stop <session>` right after sending `/exit`, so the container-restart-on-exit mechanism still works the same way it does under tmux. Nothing extra to do here — just don't assume `/exit` alone is sufficient if reasoning about this by hand.

This only makes sense to use if something outside the pane brings Claude back up after it exits (a process supervisor, a container restart policy, a wrapper loop). Before using this skill in a new deployment, confirm such a supervisor exists — otherwise `/exit` just ends the session with nothing to revive it. If unsure, ask rather than assume.

The queued `/exit` only takes effect once this turn ends and Claude Code reads from the pane's stdin again — same timing as [[restart-session]]'s `/clear`. Any tool call issued earlier in this same turn, including a channel reply, still completes normally before the exit happens.

If a background task (a `run_in_background` shell, an Agent/fork dispatch, a Monitor, a Workflow) is still running when `/exit` fires, Claude Code's own CLI shows a confirmation prompt asking whether to end it — but that prompt only renders in the terminal. A remote sender has no way to see or answer it, so the session hangs waiting on an answer that will never come. Check for outstanding work *before* running the script, not after.
</essential_principles>

<objective>
Exits this Claude Code session on remote request, for cases where a full process restart is needed rather than just clearing the conversation (e.g. recovering from a stuck state, or picking up a config change that only applies at startup).
</objective>

<quick_start>
Run the bundled script exactly as written — do not substitute a hand-written `tmux`/`herdr` command, since it validates the target pane before sending keys:

```bash
bash scripts/exit-session.sh
```
</quick_start>

<workflow>
1. Confirm the inbound channel message is `/exit` (case-sensitive, no extra text), or another clear, explicit request for a hard restart rather than a `/clear`-style reset — anything else is not this skill's trigger.
2. Check for outstanding background work: anything from this conversation you know is still running (a `run_in_background` Bash task, an Agent/fork dispatch, a Monitor watch, a Workflow run), cross-checked with `ListAgents`. If anything is still in flight:
   - Do NOT run the script. Reply on the originating channel naming what's still running, and offer `/exit` (proceed anyway — the in-flight work is discarded) and `/background` (hand it off first, then exit is safe) as tappable follow-ups.
   - End the turn. Only proceed past this step once the channel confirms proceeding anyway, or nothing is left running.
3. Acknowledge on the originating channel (e.g. a short Telegram reply like "Exiting now — should come back up shortly.") — this still reaches the user, since the exit only fires after this turn ends.
4. Run `scripts/exit-session.sh`. It auto-discovers the current pane (tmux or herdr), refuses to fire if the pane isn't running Claude Code, then sends `/exit` + Enter (and, on herdr, also stops the herdr session — see essential_principles above).
5. End the turn without further tool calls — anything queued after this point is discarded once the process exits anyway.
</workflow>

<success_criteria>
Script exits 0 and prints `Sent /exit to pane <id>` (plus `Stopped herdr session <name>` on herdr). If it exits non-zero (not in tmux or herdr, or pane running something unexpected), report the error on the channel instead of retrying with a modified command.
</success_criteria>
