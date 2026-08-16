#!/usr/bin/env python3
"""
statusLine command wrapper: caches context_window/rate_limits fields from
Claude Code's statusline JSON to a local file (for the usage-alert Stop hook
to poll, with zero extra API calls), then passes the original stdin through
unchanged to ccstatusline so the visible statusline is unaffected.

Requires `npx` (Node.js) on PATH — it shells out to the `ccstatusline`
npm package for the actual rendering. If you use a different statusline
renderer, replace the subprocess.run command below with your own.
"""
import json
import os
import subprocess
import sys
import tempfile
import time

CACHE_PATH = os.path.expanduser("~/.claude/session-status-cache.json")


def write_cache(data):
    context_window = data.get("context_window") or {}
    rate_limits = data.get("rate_limits") or {}
    five_hour = rate_limits.get("five_hour") or {}
    seven_day = rate_limits.get("seven_day") or {}

    ctx_size = context_window.get("context_window_size")
    ctx_used_tokens = context_window.get("total_input_tokens")
    ctx_used_pct = context_window.get("used_percentage")
    if ctx_used_pct is None and ctx_used_tokens is not None and ctx_size:
        try:
            ctx_used_pct = round(ctx_used_tokens / ctx_size * 100, 1)
        except ZeroDivisionError:
            ctx_used_pct = None

    cache = {
        "cached_at": time.time(),
        "session_id": data.get("session_id"),
        "context_window": {
            "used_percentage": ctx_used_pct,
            "total_input_tokens": ctx_used_tokens,
            "context_window_size": ctx_size,
        },
        "rate_limits": {
            "five_hour": {
                "used_percentage": five_hour.get("used_percentage"),
                "resets_at": five_hour.get("resets_at"),
            },
            "seven_day": {
                "used_percentage": seven_day.get("used_percentage"),
                "resets_at": seven_day.get("resets_at"),
            },
        },
    }

    cache_dir = os.path.dirname(CACHE_PATH)
    fd, tmp_path = tempfile.mkstemp(dir=cache_dir, prefix=".status-cache-")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(cache, f)
        os.replace(tmp_path, CACHE_PATH)
    except Exception:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def main():
    raw = sys.stdin.buffer.read()

    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            write_cache(data)
    except Exception:
        pass  # never let cache-write problems affect the visible statusline

    result = subprocess.run(
        ["npx", "-y", "ccstatusline@latest"],
        input=raw,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    sys.stdout.buffer.write(result.stdout)
    sys.stderr.buffer.write(result.stderr)
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
