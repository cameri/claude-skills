#!/usr/bin/env python3
"""
Stop hook: reads the usage cache written by statusline-wrapper.py and, when
context-window or Claude subscription rate-limit usage has climbed into a
new "band" since it was last shown, sends a standalone Telegram message
directly via the Bot API (independent of the model, so it's deterministic
and costs no extra tokens).

Useful when you can see usage in the terminal statusline but not on your
primary channel (e.g. Telegram) — this pushes a notification there too.

Requires ~/.claude/channels/sandbox-manager/hooks-config.json to have
"telegram_chat_id" and "telegram_env_path" set (the latter points at a
.env file containing TELEGRAM_BOT_TOKEN=...). No-ops silently if either is
missing. Optional "timezone" key (IANA name, e.g. "America/Toronto")
controls how reset times are displayed; defaults to UTC.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

CONFIG_PATH = os.environ.get(
    "SANDBOX_MANAGER_HOOKS_CONFIG",
    os.path.expanduser("~/.claude/channels/sandbox-manager/hooks-config.json"),
)
CACHE_PATH = os.path.expanduser("~/.claude/session-status-cache.json")
STATE_FILENAME = "usage-alert-state.json"

CONTEXT_BANDS = [50, 70, 85, 95]
FIVE_HOUR_BANDS = [50, 75, 85, 90, 95]
WEEKLY_BANDS = [25, 50, 75, 80, 85, 90, 95]

# Max staleness for the cache before we treat it as "no data yet" (covers a
# session that hasn't rendered a statusline this run, or a stuck wrapper).
MAX_CACHE_AGE_SECONDS = 3600


def load_config():
    try:
        with open(CONFIG_PATH) as f:
            return json.load(f)
    except Exception:
        return {}


def get_tz(config):
    tz_name = config.get("timezone")
    if tz_name:
        try:
            from zoneinfo import ZoneInfo
            return ZoneInfo(tz_name)
        except Exception:
            pass
    return timezone.utc


def band_for(pct, bands):
    if pct is None:
        return None
    reached = 0
    for b in bands:
        if pct >= b:
            reached = b
    return reached


def load_json(path):
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return None


def save_state(state_path, state):
    state_dir = os.path.dirname(state_path)
    os.makedirs(state_dir, exist_ok=True)
    tmp_path = state_path + ".tmp"
    with open(tmp_path, "w") as f:
        json.dump(state, f)
    os.replace(tmp_path, state_path)


def read_bot_token(env_path):
    try:
        with open(os.path.expanduser(env_path)) as f:
            for line in f:
                line = line.strip()
                if line.startswith("TELEGRAM_BOT_TOKEN="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    except OSError:
        pass
    return None


def human_delta(seconds):
    if seconds is None:
        return None
    seconds = max(0, int(seconds))
    days, rem = divmod(seconds, 86400)
    hours, rem = divmod(rem, 3600)
    minutes, _ = divmod(rem, 60)
    if days >= 1:
        return f"{days}d {hours}h"
    if hours >= 1:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"


def format_reset(resets_at, now, tz):
    if resets_at is None:
        return None, None
    dt = datetime.fromtimestamp(resets_at, tz=tz)
    time_str = dt.strftime("%H:%M %Z")
    return time_str, human_delta(resets_at - now)


def build_message(metrics, now, tz):
    lines = ["\U0001F4CA Usage update", ""]

    ctx = metrics["context"]
    if ctx["pct"] is not None:
        marker = "\U0001F53A " if ctx["triggered"] else ""
        suffix = " — threshold crossed" if ctx["triggered"] else ""
        tok_str = ""
        if ctx["used_tokens"] is not None and ctx["total_tokens"]:
            tok_str = f" (~{round(ctx['used_tokens']/1000)}k/{round(ctx['total_tokens']/1000)}k tokens)"
        lines.append(f"{marker}Context: {ctx['pct']:.0f}% used{tok_str}{suffix}")
        lines.append("")

    for key, label in (("five_hour", "5-hour limit"), ("seven_day", "Weekly limit")):
        m = metrics[key]
        if m["pct"] is None:
            continue
        marker = "\U0001F53A " if m["triggered"] else ""
        suffix = " — threshold crossed" if m["triggered"] else ""
        lines.append(f"{marker}{label}: {m['pct']:.0f}% used{suffix}")
        time_str, delta_str = format_reset(m["resets_at"], now, tz)
        if time_str:
            lines.append(f"resets {time_str} (in {delta_str})")
        lines.append("")

    return "\n".join(lines).rstrip()


def send_telegram_message(token, chat_id, text):
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = urllib.parse.urlencode({"chat_id": chat_id, "text": text}).encode()
    req = urllib.request.Request(url, data=payload, method="POST")
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def run():
    config = load_config()
    chat_id = config.get("telegram_chat_id")
    env_path = config.get("telegram_env_path")
    if not chat_id or not env_path:
        return

    state_dir = os.path.dirname(os.path.expanduser(env_path))
    state_path = os.path.join(state_dir, STATE_FILENAME)
    tz = get_tz(config)

    cache = load_json(CACHE_PATH)
    if not cache:
        return

    now = time.time()
    if now - (cache.get("cached_at") or 0) > MAX_CACHE_AGE_SECONDS:
        return

    state = load_json(state_path) or {}

    cw = cache.get("context_window") or {}
    rl = cache.get("rate_limits") or {}
    five_hour = rl.get("five_hour") or {}
    seven_day = rl.get("seven_day") or {}

    session_id = cache.get("session_id")

    metrics = {}

    # context: anchored to session_id (resets when the session clears)
    ctx_pct = cw.get("used_percentage")
    ctx_band = band_for(ctx_pct, CONTEXT_BANDS)
    ctx_state = state.get("context") or {}
    ctx_last_band = ctx_state.get("band", 0) if ctx_state.get("session_id") == session_id else 0
    metrics["context"] = {
        "pct": ctx_pct,
        "used_tokens": cw.get("total_input_tokens"),
        "total_tokens": cw.get("context_window_size"),
        "band": ctx_band,
        "last_band": ctx_last_band,
        "triggered": ctx_band is not None and ctx_band > ctx_last_band,
        "anchor": session_id,
    }

    # rate-limit windows: anchored to resets_at (resets when the window rolls over)
    for key, bucket, bands in (
        ("five_hour", five_hour, FIVE_HOUR_BANDS),
        ("seven_day", seven_day, WEEKLY_BANDS),
    ):
        pct = bucket.get("used_percentage")
        resets_at = bucket.get("resets_at")
        band = band_for(pct, bands)
        bucket_state = state.get(key) or {}
        last_band = bucket_state.get("band", 0) if bucket_state.get("resets_at") == resets_at else 0
        metrics[key] = {
            "pct": pct,
            "resets_at": resets_at,
            "band": band,
            "last_band": last_band,
            "triggered": band is not None and band > last_band,
            "anchor": resets_at,
        }

    triggered_any = any(m["triggered"] for m in metrics.values())

    if triggered_any:
        token = read_bot_token(env_path)
        if not token:
            return
        message = build_message(metrics, now, tz)
        try:
            send_telegram_message(token, chat_id, message)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError):
            return  # don't persist state on send failure; retry next turn

    new_state = dict(state)
    for key, anchor_field in (("context", "session_id"), ("five_hour", "resets_at"), ("seven_day", "resets_at")):
        m = metrics[key]
        if m["pct"] is None:
            continue  # no data this run, leave stored state untouched
        new_state[key] = {anchor_field: m["anchor"], "band": m["band"]}
    save_state(state_path, new_state)


def main():
    try:
        run()
    except Exception:
        pass
    print(json.dumps({}))


if __name__ == "__main__":
    main()
