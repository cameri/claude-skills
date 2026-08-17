#!/usr/bin/env python3
"""
SessionStart hook: notify the owner over Telegram when a session begins, so
they know it came up. "compact" fires mid-conversation, not at a real
boundary, so it's skipped. "resume" gets its own distinct message (naming
the session that was resumed) rather than the generic startup one, since
resuming isn't a fresh start from the owner's perspective.

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
SESSIONS_REGISTRY_DIR = os.environ.get(
    "SANDBOX_MANAGER_SESSIONS_DIR",
    os.path.expanduser("~/.claude/sessions"),
)
SKIP_SOURCES = {"compact"}


def load_config():
    try:
        with open(CONFIG_PATH) as f:
            return json.load(f)
    except Exception:
        return {}


# ~/.claude/sessions/*.json is the CLI's own live registry (pid-keyed) — see
# telegram-ng's server.ts readSessionNames() for the same lookup, used to
# label the /sessions picker. Mirrored here rather than shared since this
# hook is plain Python with no dependency on the plugin's TS runtime.
def resolve_session_name(session_id, registry_dir):
    if not session_id:
        return None
    try:
        files = os.listdir(registry_dir)
    except OSError:
        return None
    for fname in files:
        if not fname.endswith(".json"):
            continue
        try:
            with open(os.path.join(registry_dir, fname)) as f:
                data = json.load(f)
        except Exception:
            continue
        if data.get("sessionId") == session_id:
            return data.get("name")
    return None


def build_notification_text(source, session_id, registry_dir):
    if source in SKIP_SOURCES:
        return None
    if source == "resume":
        name = resolve_session_name(session_id, registry_dir)
        label = name or (session_id[:8] if session_id else "unknown")
        return f"Resumed session: {label}."
    return f"Session started (source: {source})."


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

    text = build_notification_text(
        payload.get("source"), payload.get("session_id"), SESSIONS_REGISTRY_DIR
    )
    if text is None:
        return

    config = load_config()
    chat_id = config.get("telegram_chat_id")
    env_path = config.get("telegram_env_path")
    if not chat_id or not env_path:
        return

    token = load_bot_token(env_path)
    if not token:
        return

    data = urllib.parse.urlencode({"chat_id": chat_id, "text": text}).encode()
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        urllib.request.urlopen(urllib.request.Request(url, data=data), timeout=8)
    except Exception:
        pass


if __name__ == "__main__":
    main()
