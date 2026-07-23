---
name: branch-session
description: Creates a branch of the current Claude Code conversation at the current point by sending /branch followed by Enter to the tmux pane it runs in. Fires when a connected channel (e.g. Telegram) sends a message that is exactly /branch, or explicitly asks to branch or fork the current conversation.
user-invocable: false
allowed-tools:
  - Bash
  - mcp__plugin_telegram_telegram__reply
---

<essential_principles>
`/branch` (formerly `/fork`) splits off a new session from this conversation's current point rather than replacing it in place — a lighter-weight action than [[restart-session]]'s `/clear` or [[resume-session]]'s `/resume`, since the original conversation isn't discarded. Only act on a request from a channel that already trusts the sender via its own access control.

The queued `/branch` only takes effect once this turn ends and Claude Code reads from the pane's stdin again — same timing as [[restart-session]]'s `/clear`. Any tool call issued earlier in this same turn, including a channel reply, still completes normally before the branch happens.
</essential_principles>

<objective>
Forks this Claude Code session into a new branch at the current point on remote request, so exploratory follow-up work doesn't have to happen in the same line of conversation.
</objective>

<quick_start>
Run the bundled script exactly as written — do not substitute a hand-written `tmux` command, since it validates the target pane before sending keys:

```bash
bash scripts/branch-session.sh
```
</quick_start>

<workflow>
1. Confirm the inbound channel message is `/branch` (case-sensitive, no extra text), or another clear, explicit request to branch/fork the current conversation — anything else is not this skill's trigger.
2. Acknowledge on the originating channel (e.g. "Branching this conversation now.") — this still reaches the user, since the branch only fires after this turn ends.
3. Run `scripts/branch-session.sh`. It auto-discovers the current tmux pane, refuses to fire if the pane isn't running Claude Code, then sends `/branch` + Enter.
4. End the turn without further tool calls — anything queued after this point is discarded once the branch happens anyway.
</workflow>

<success_criteria>
Script exits 0 and prints `Sent /branch to pane <id>`. If it exits non-zero (not in tmux, or pane running something unexpected), report the error on the channel instead of retrying with a modified command.
</success_criteria>
