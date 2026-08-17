#!/usr/bin/env python3
"""
Stop hook: if the most recent inbound message from a configured Telegram
channel plugin has not been followed by that plugin's `reply` tool call,
block the stop and tell the assistant to reply before finishing.

Repeat-offense backstop: without this, a model can correct itself once in
conversation and still drift back to plain-text replies or AskUserQuestion
on a later turn — channel messages need a mechanical guarantee, not a
remembered preference.

Configure the channel plugin name via
~/.claude/channels/sandbox-manager/hooks-config.json key
"telegram_channel_plugin" (defaults to "telegram-ng", the current official
Telegram channel plugin). The channel tag prefix and reply tool name are
both derived from that one name, so a rename only needs updating in one
place.
"""
import json
import os
import sys

CONFIG_PATH = os.environ.get(
    "SANDBOX_MANAGER_HOOKS_CONFIG",
    os.path.expanduser("~/.claude/channels/sandbox-manager/hooks-config.json"),
)
DEFAULT_CHANNEL_PLUGIN = "telegram-ng"


def load_config():
    try:
        with open(CONFIG_PATH) as f:
            return json.load(f)
    except Exception:
        return {}


def get_text(message):
    content = message.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(
            block.get("text", "")
            for block in content
            if isinstance(block, dict) and block.get("type") == "text"
        )
    return ""


def main():
    config = load_config()
    channel_plugin = config.get("telegram_channel_plugin", DEFAULT_CHANNEL_PLUGIN)
    channel_tag = f'<channel source="plugin:{channel_plugin}:telegram"'
    reply_tool = f"mcp__plugin_{channel_plugin}_telegram__reply"

    try:
        payload = json.load(sys.stdin)
    except Exception:
        print(json.dumps({}))
        return

    transcript_path = payload.get("transcript_path")
    if not transcript_path:
        print(json.dumps({}))
        return

    try:
        with open(transcript_path) as f:
            raw_lines = f.readlines()
    except OSError:
        print(json.dumps({}))
        return

    entries = []
    for line in raw_lines:
        line = line.strip()
        if not line:
            continue
        try:
            entries.append(json.loads(line))
        except json.JSONDecodeError:
            continue

    last_channel_seen = False
    last_requires_reply = False
    replied_since = False

    for entry in entries:
        if entry.get("isSidechain"):
            continue  # subagent turns don't count

        entry_type = entry.get("type")
        message = entry.get("message", {})

        if entry_type == "user":
            content = message.get("content")
            is_tool_result = isinstance(content, list) and any(
                isinstance(b, dict) and b.get("type") == "tool_result"
                for b in content
            )
            if is_tool_result:
                continue
            text = get_text(message)
            if channel_tag in text:
                last_channel_seen = True
                replied_since = False  # a new inbound message needs its own reply
                # poll_answer notifications (identified by a poll_id attribute)
                # are informational-only by design — a vote/retraction isn't
                # a request, so it shouldn't force a reply on every turn.
                last_requires_reply = 'poll_id="' not in text

        elif entry_type == "assistant" and last_channel_seen:
            content = message.get("content")
            if isinstance(content, list):
                for block in content:
                    if (
                        isinstance(block, dict)
                        and block.get("type") == "tool_use"
                        and block.get("name") == reply_tool
                    ):
                        replied_since = True

    if last_channel_seen and last_requires_reply and not replied_since:
        print(
            json.dumps(
                {
                    "decision": "block",
                    "reason": (
                        f"The most recent inbound message came from {channel_plugin}, "
                        f"but no {reply_tool} call has happened since. Reply via that "
                        "channel's reply tool before finishing this turn — do not use "
                        "AskUserQuestion or end with plain assistant text for a "
                        "channel-originated request."
                    ),
                }
            )
        )
        return

    print(json.dumps({}))


if __name__ == "__main__":
    main()
