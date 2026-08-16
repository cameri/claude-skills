#!/usr/bin/env python3
"""
PreToolUse hook (Bash): block recursive-force rm commands whose path is
built from a shell variable immediately followed by "/" or "*" — e.g.
`rm -rf $BUILD_DIR/` or `rm -rf ${DIR}/*`. If the variable is unset or
empty, that collapses to `rm -rf /` or `rm -rf *`, wiping far more than
intended. This is the classic unbound-variable rm disaster.

Variables already guarded with bash's own ${VAR:?msg}/${VAR:-default}/
${VAR:=default} syntax are left alone — bash itself will error or
substitute safely. A short allowlist of always-set variables (HOME, PWD,
OLDPWD, CLAUDE_PROJECT_DIR) is also excluded to cut noise.
"""
import json
import re
import sys

SAFE_VARS = {"HOME", "PWD", "OLDPWD", "CLAUDE_PROJECT_DIR"}

# A bare $VAR or ${VAR}, optionally followed by a closing quote, then
# immediately a "/" or "*". Deliberately does NOT match ${VAR:-x} etc.,
# since the extra characters before the closing brace break the match.
VAR_THEN_SLASH_OR_GLOB = re.compile(
    r'\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?"?[/*]'
)

SEGMENT_SPLIT = re.compile(r'[;&|\n]+')


def has_recursive_force(segment):
    tokens = segment.split()
    has_r = False
    has_f = False
    for tok in tokens[1:]:
        if tok.startswith('--'):
            if tok == '--recursive':
                has_r = True
            if tok == '--force':
                has_f = True
        elif tok.startswith('-') and len(tok) > 1:
            letters = tok[1:]
            if any(c in ('r', 'R') for c in letters):
                has_r = True
            if 'f' in letters:
                has_f = True
    return has_r and has_f


def find_risky_var(segment):
    for match in VAR_THEN_SLASH_OR_GLOB.finditer(segment):
        if match.group(1) not in SAFE_VARS:
            return match.group(0)
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
    if not command or "rm" not in command:
        print(json.dumps({}))
        return

    for segment in SEGMENT_SPLIT.split(command):
        stripped = segment.strip()
        if not re.match(r'(sudo\s+)?rm(\s|$)', stripped):
            continue
        if not has_recursive_force(stripped):
            continue
        risky = find_risky_var(stripped)
        if risky:
            print(json.dumps({
                "decision": "block",
                "reason": (
                    f"Refusing to run `{stripped}` — it deletes recursively "
                    f"via a variable ({risky}) that isn't guarded. If that "
                    "variable is unset or empty at runtime, this collapses "
                    "to `rm -rf /` or `rm -rf *`. Guard it first: use "
                    "`${VAR:?VAR must be set}` in the command, or check "
                    "`[ -n \"$VAR\" ]` before deleting, then retry."
                ),
            }))
            return

    print(json.dumps({}))


if __name__ == "__main__":
    main()
