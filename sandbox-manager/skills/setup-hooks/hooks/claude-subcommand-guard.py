#!/usr/bin/env python3
"""
PreToolUse hook (Bash): block invoking the `claude` binary with a
subcommand-shaped first argument that isn't a real top-level subcommand.

Why this exists: the `claude` CLI does NOT error on an unrecognized
subcommand — it silently treats everything after `claude` as a literal
prompt string and launches a full second agentic `claude` session. On
2026-08-22, running `claude marketplace remove taches-cc-resources` (the
real command is `claude plugin marketplace remove ...` — `marketplace` is
nested under `plugin`, not top-level) launched exactly such a nested
session, which opened its own telegram-ng MCP bot connection and collided
with the main session's long-running Telegram poller (Bot API allows only
one poller per bot token), killing Telegram for the rest of that session.

Detection is deliberately narrow to avoid false positives: it only fires
when the first non-flag argument after `claude` looks like a subcommand
(a bare lowercase/hyphen word, e.g. "marketplace", "config", "login") and
is not in the verified allowlist below. A quoted natural-language prompt
("claude \"refactor this file\"") does not match that shape and is left
alone — this hook cannot and does not try to distinguish every possible
legitimate prompt from every possible subcommand typo, only the common
"guessed a plausible-sounding subcommand name" mistake. It also does not
try to account for global flags that consume a following value (e.g.
`claude --model sonnet plugin list`) — no invocation in this repo combines
a value-taking flag before the subcommand, so the first non-flag token is
always the real subcommand position in practice.

Allowlist verified against `claude --help`'s own Commands section (plus
`ssh`, documented in the settings schema's sshConfigs description but not
shown in --help output) — re-verify with `claude --help` if this ever
false-positives on a real subcommand, rather than just widening the list
blindly.
"""
import json
import re
import shlex
import sys

ALLOWED_SUBCOMMANDS = {
    "agents", "auth", "auto-mode", "doctor", "gateway", "import", "install",
    "mcp", "plugin", "plugins", "project", "setup-token", "ultrareview",
    "update", "upgrade", "ssh",
}

SEGMENT_SPLIT = re.compile(r'[;&|\n]+')
LEADING_PREFIX = re.compile(
    r'^(?:(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*(?:sudo|env|command|exec|time|nohup)\s+)*'
)
SUBCOMMAND_SHAPE = re.compile(r'^[a-z][a-z-]*$')


def find_claude_invocation_tokens(segment):
    """If `segment` invokes the claude binary (allowing sudo/env/VAR= prefixes),
    return the tokens after it. Otherwise return None."""
    stripped = LEADING_PREFIX.sub('', segment.strip())
    try:
        tokens = shlex.split(stripped)
    except ValueError:
        return None
    if not tokens:
        return None
    first = tokens[0]
    if first != "claude" and not first.endswith("/claude"):
        return None
    return tokens[1:]


def first_subcommand_candidate(tokens):
    for tok in tokens:
        if tok.startswith("-"):
            continue
        return tok
    return None


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        print(json.dumps({}))
        return

    if payload.get("tool_name") != "Bash":
        print(json.dumps({}))
        return

    command = payload.get("tool_input", {}).get("command", "")
    if not command or "claude" not in command:
        print(json.dumps({}))
        return

    for segment in SEGMENT_SPLIT.split(command):
        rest = find_claude_invocation_tokens(segment)
        if rest is None:
            continue
        candidate = first_subcommand_candidate(rest)
        if candidate is None:
            continue
        if not SUBCOMMAND_SHAPE.match(candidate):
            continue
        if candidate in ALLOWED_SUBCOMMANDS:
            continue
        print(json.dumps({
            "decision": "block",
            "reason": (
                f"Refusing to run `claude {candidate} ...` — \"{candidate}\" is "
                "not a real top-level `claude` subcommand. The CLI does NOT "
                "error on an unrecognized subcommand: it silently treats "
                "everything after `claude` as a literal prompt string and "
                "launches a full second agentic claude session instead. That "
                "exact mistake (`claude marketplace remove ...` instead of "
                "`claude plugin marketplace remove ...`) killed a live "
                "Telegram MCP connection on 2026-08-22 when the nested "
                "session opened a second bot poller. Verify the real "
                "subcommand with `claude --help` or `claude <subcommand> "
                "--help` first, or use the sandbox-manager:manage-plugins "
                "skill for plugin/marketplace operations instead of "
                "freehanding `claude plugin ...` commands."
            ),
        }))
        return

    print(json.dumps({}))


if __name__ == "__main__":
    main()
