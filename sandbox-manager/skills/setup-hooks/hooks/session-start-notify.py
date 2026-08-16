#!/usr/bin/env python3
"""
SessionStart hook: notify the owner over Telegram when a genuinely new
session begins, so they know it came up. Skips "resume" (and "compact",
which fires mid-conversation, not at a real boundary) since those aren't a
fresh start from the owner's perspective.

Requires ~/.claude/channels/sandbox-manager/hooks-config.json to have
"telegram_chat_id" and "telegram_env_path" set (the latter points at a
.env file containing TELEGRAM_BOT_TOKEN=...). No-ops silently if either is
missing so a partial setup never breaks SessionStart.
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request

CONFIG_PATH = os.environ.get(
    "SANDBOX_MANAGER_HOOKS_CONFIG",
    os.path.expanduser("~/.claude/channels/sandbox-manager/hooks-config.json"),
)
SKIP_SOURCES = {"resume", "compact"}


def load_config():
    try:
        with open(CONFIG_PATH) as f:
            return json.load(f)
    except Exception:
        return {}


def load_bot_token(env_path):
    try:
        with open(os.path.expanduser(env_path)) as f:
            for line in f:
                match = re.match(r"^TELEGRAM_BOT_TOKEN=(.+)$", line.strip())
                if match:
                    return match.group(1).strip().strip('"').strip("'")
    except OSError:
        pass
    return None


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return

    source = payload.get("source")
    if source in SKIP_SOURCES:
        return

    config = load_config()
    chat_id = config.get("telegram_chat_id")
    env_path = config.get("telegram_env_path")
    if not chat_id or not env_path:
        return

    token = load_bot_token(env_path)
    if not token:
        return

    text = f"Session started (source: {source})."
    data = urllib.parse.urlencode({"chat_id": chat_id, "text": text}).encode()
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        urllib.request.urlopen(urllib.request.Request(url, data=data), timeout=8)
    except Exception:
        pass


if __name__ == "__main__":
    main()
