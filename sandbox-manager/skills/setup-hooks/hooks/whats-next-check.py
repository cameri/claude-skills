#!/usr/bin/env python3
"""
SessionStart hook: if a handoff document exists, tell Claude to read it and
resume that work. Once the described work is complete or no longer
relevant, the file should be deleted -- at that point this hook does
nothing.

Path resolution order:
1. "handoff_doc_path" in ~/.claude/channels/sandbox-manager/hooks-config.json
   (absolute path, or relative to CLAUDE_PROJECT_DIR)
2. $CLAUDE_PROJECT_DIR/whats-next.md
3. ~/whats-next.md
"""
import json
import os
import sys

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


def resolve_handoff_path():
    configured = load_config().get("handoff_doc_path")
    project_dir = os.environ.get("CLAUDE_PROJECT_DIR")

    if configured:
        if os.path.isabs(configured):
            return configured
        base = project_dir or os.path.expanduser("~")
        return os.path.join(base, configured)

    if project_dir:
        return os.path.join(project_dir, "whats-next.md")

    return os.path.expanduser("~/whats-next.md")


def main():
    try:
        sys.stdin.read()
    except Exception:
        pass

    handoff_path = resolve_handoff_path()

    try:
        with open(handoff_path, "r") as f:
            f.read(1)
    except OSError:
        return

    output = {
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": (
                f"A handoff document exists at {handoff_path} from a "
                "previous session that was interrupted mid-task. Read it "
                "and resume that work before starting anything else, "
                "unless the user's first message clearly asks for "
                "something unrelated. Once the work it describes is "
                "complete or no longer relevant, delete the file."
            ),
        }
    }
    print(json.dumps(output))


if __name__ == "__main__":
    main()
