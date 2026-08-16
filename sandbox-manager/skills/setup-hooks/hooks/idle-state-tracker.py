#!/usr/bin/env python3
"""
Stop hook: after every assistant turn, record "last activity" to a small
state file so an out-of-process channel bot (e.g. a Telegram bot that polls
independently of the Claude Code CLI) can decide whether to ask "still going
or done for now?" after a period of no activity.

This hook only observes — it never blocks the Stop event.

Configurable via ~/.claude/channels/sandbox-manager/hooks-config.json
(see load_config() in the sibling hook scripts) key "idle_state_dir", or the
IDLE_STATE_DIR env var, falling back to ~/.claude/channels/idle-tracker/.
"""
import json
import os
import sys
from datetime import datetime, timezone

STATE_FILENAME = "idle-state.json"
CONFIG_PATH = os.environ.get(
    "SANDBOX_MANAGER_HOOKS_CONFIG",
    os.path.expanduser("~/.claude/channels/sandbox-manager/hooks-config.json"),
)


def load_config():
    try:
        with open(CONFIG_PATH) as f:
            return json.load(f)
    except Exception:
        return {}


def get_state_dir():
    override = os.environ.get("IDLE_STATE_DIR")
    if override:
        return override
    configured = load_config().get("idle_state_dir")
    if configured:
        return os.path.expanduser(configured)
    return os.path.join(os.path.expanduser("~"), ".claude", "channels", "idle-tracker")


def get_now_ms():
    # Test hook: honor FAKE_NOW_MS so tests are deterministic without mocking
    # the system clock. Real runs use real time when unset.
    fake = os.environ.get("FAKE_NOW_MS")
    if fake:
        return int(fake)
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        payload = {}

    session_id = payload.get("session_id") if isinstance(payload, dict) else None

    now_ms = get_now_ms()
    now_iso = datetime.fromtimestamp(now_ms / 1000, tz=timezone.utc).isoformat()

    state = {
        "last_activity_iso": now_iso,
        "last_activity_ms": now_ms,
        # Always true for now — distinguishing genuine "pending work" (e.g. a
        # queued follow-up that makes an idle prompt unwanted) is a
        # deliberately deferred future improvement, not built here.
        "idle_safe": True,
        "session_id": session_id,
    }

    state_dir = get_state_dir()
    try:
        os.makedirs(state_dir, exist_ok=True)
        state_path = os.path.join(state_dir, STATE_FILENAME)
        with open(state_path, "w") as f:
            json.dump(state, f)
    except OSError:
        pass  # observational only; never block the Stop event on write failure

    print(json.dumps({}))


if __name__ == "__main__":
    main()
