#!/usr/bin/env python3
"""
Installs the selected bundled hook scripts into a hooks directory, writes
their non-secret personal config (Telegram chat ID, env-file path, etc.) to
a small local config file, and registers each hook in the target
settings.json — all idempotently, so re-running with the same or a wider
--hook selection is safe.

Never run interactively by a human — this is invoked by the setup-hooks
skill after it has gathered the needed values from the user via
conversation. See SKILL.md in the parent skill directory.
"""
import argparse
import json
import os
import shutil
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
HOOKS_SRC_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), "hooks")

DEFAULT_HOOKS_DIR = os.path.expanduser("~/.claude/hooks")
DEFAULT_SETTINGS_PATH = os.path.expanduser("~/.claude/settings.json")
DEFAULT_CONFIG_PATH = os.path.expanduser(
    "~/.claude/channels/sandbox-manager/hooks-config.json"
)

# event=None means "not a Stop/PreToolUse/SessionStart hook" (statusLine is
# a separate top-level settings.json key, handled specially below).
HOOK_DEFS = {
    "destructive-var-guard": {
        "event": "PreToolUse",
        "matcher": "Bash",
        "timeout": 10,
        "needs": [],
        "config_keys": [],
    },
    "telegram-reply-check": {
        "event": "Stop",
        "matcher": None,
        "timeout": 10,
        "needs": [],
        "config_keys": ["telegram_channel_plugin"],
    },
    "usage-alert": {
        "event": "Stop",
        "matcher": None,
        "timeout": 15,
        "needs": ["telegram_chat_id", "telegram_env_path"],
        "config_keys": ["telegram_chat_id", "telegram_env_path", "timezone"],
    },
    "idle-state-tracker": {
        "event": "Stop",
        "matcher": None,
        "timeout": 10,
        "needs": [],
        "config_keys": ["idle_state_dir"],
    },
    "whats-next-check": {
        "event": "SessionStart",
        "matcher": None,
        "timeout": 10,
        "needs": [],
        "config_keys": ["handoff_doc_path"],
    },
    "session-start-notify": {
        "event": "SessionStart",
        "matcher": None,
        "timeout": 10,
        "needs": ["telegram_chat_id", "telegram_env_path"],
        "config_keys": ["telegram_chat_id", "telegram_env_path"],
    },
    "statusline-wrapper": {
        "event": None,
        "special": "statusline",
        "needs": [],
        "config_keys": [],
    },
    "pay-invoice-guard": {
        "event": "PreToolUse",
        "matcher": "mcp__plugin_lightning_lightning__pay_invoice",
        "timeout": 10,
        "needs": ["pay_invoice_authorized_chat_id"],
        "config_keys": ["pay_invoice_authorized_chat_id", "telegram_channel_plugin"],
    },
    "plugin-version-check": {
        "event": "Stop",
        "matcher": None,
        "timeout": 10,
        "needs": [],
        "config_keys": ["plugins_repo_path"],
    },
}


def load_json(path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError:
        return default
    except json.JSONDecodeError as e:
        print(f"error: {path} is not valid JSON: {e}", file=sys.stderr)
        sys.exit(1)


def write_json(path, data, mode=None):
    # Resolve symlinks first: os.replace() on a symlink path unlinks the
    # symlink itself and drops a plain file in its place, silently
    # detaching the file from wherever it was tracked (e.g. a git-managed
    # canonical copy). Writing through the real target keeps the symlink
    # intact.
    real_path = os.path.realpath(path)
    os.makedirs(os.path.dirname(real_path), exist_ok=True)
    tmp_path = real_path + ".tmp"
    with open(tmp_path, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    os.replace(tmp_path, real_path)
    if mode is not None:
        os.chmod(real_path, mode)


def command_script_path(command):
    """Extract the script path from a "python3 <path>" command and resolve
    it (expanduser + realpath) so entries that differ only in literal
    spelling — "~/.claude/hooks/x.py" vs its expanded absolute form, or a
    symlinked hooks dir vs its real target — are recognized as the same
    script."""
    parts = (command or "").split(None, 1)
    if len(parts) != 2:
        return None
    return os.path.realpath(os.path.expanduser(parts[1]))


def merge_hook_group(settings, event, matcher, entry):
    """Idempotently add `entry` to the (event, matcher) group. Returns True
    if it was newly added, False if an entry pointing at the same script
    already existed."""
    settings.setdefault("hooks", {})
    groups = settings["hooks"].setdefault(event, [])
    target_group = None
    for g in groups:
        if g.get("matcher") == matcher:
            target_group = g
            break
    if target_group is None:
        target_group = {"hooks": []}
        if matcher is not None:
            target_group["matcher"] = matcher
        groups.append(target_group)

    new_script = command_script_path(entry["command"])
    existing_scripts = {command_script_path(h.get("command")) for h in target_group["hooks"]}
    if new_script is not None and new_script in existing_scripts:
        return False
    target_group["hooks"].append(entry)
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--hook",
        action="append",
        dest="hooks",
        required=True,
        choices=sorted(HOOK_DEFS),
        help="Hook to install (repeatable).",
    )
    parser.add_argument("--hooks-dir", default=DEFAULT_HOOKS_DIR)
    parser.add_argument("--settings-path", default=DEFAULT_SETTINGS_PATH)
    parser.add_argument("--config-path", default=DEFAULT_CONFIG_PATH)
    parser.add_argument("--telegram-chat-id")
    parser.add_argument("--telegram-env-path")
    parser.add_argument("--telegram-channel-plugin")
    parser.add_argument("--timezone")
    parser.add_argument("--handoff-doc-path")
    parser.add_argument("--idle-state-dir")
    parser.add_argument("--pay-invoice-authorized-chat-id")
    parser.add_argument("--plugins-repo-path")
    parser.add_argument(
        "--force-statusline",
        action="store_true",
        help="Overwrite an existing statusLine command that isn't already this wrapper.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would change without writing anything.",
    )
    args = parser.parse_args()

    provided_config = {
        "telegram_chat_id": args.telegram_chat_id,
        "telegram_env_path": args.telegram_env_path,
        "telegram_channel_plugin": args.telegram_channel_plugin,
        "timezone": args.timezone,
        "handoff_doc_path": args.handoff_doc_path,
        "idle_state_dir": args.idle_state_dir,
        "pay_invoice_authorized_chat_id": args.pay_invoice_authorized_chat_id,
        "plugins_repo_path": args.plugins_repo_path,
    }
    provided_config = {k: v for k, v in provided_config.items() if v}

    # Validate required config is present for every selected hook before
    # touching any files.
    missing = []
    for name in args.hooks:
        d = HOOK_DEFS[name]
        for key in d["needs"]:
            if key not in provided_config:
                missing.append((name, key))
    if missing:
        print("error: missing required config for selected hooks:", file=sys.stderr)
        for name, key in missing:
            print(f"  {name} needs --{key.replace('_', '-')}", file=sys.stderr)
        sys.exit(1)

    hooks_dir = os.path.expanduser(args.hooks_dir)
    settings_path = os.path.expanduser(args.settings_path)
    config_path = os.path.expanduser(args.config_path)

    settings = load_json(settings_path, {})
    config = load_json(config_path, {})
    config.update(provided_config)

    installed = []
    registered = []
    skipped_existing = []

    for name in args.hooks:
        d = HOOK_DEFS[name]
        src = os.path.join(HOOKS_SRC_DIR, f"{name}.py")
        dst = os.path.join(hooks_dir, f"{name}.py")

        if not args.dry_run:
            os.makedirs(hooks_dir, exist_ok=True)
            shutil.copyfile(src, dst)
            os.chmod(dst, 0o755)
        installed.append(dst)

        if d.get("special") == "statusline":
            command = f"python3 {dst}"
            current = settings.get("statusLine")
            current_command = current.get("command") if isinstance(current, dict) else None
            already_ours = (
                current_command is not None
                and command_script_path(current_command) == command_script_path(command)
            )
            if already_ours:
                skipped_existing.append("statusLine (already set)")
            elif current and not args.force_statusline:
                print(
                    f"warning: statusLine is already set to a different command "
                    f"({current.get('command')!r}) — not overwriting. Pass "
                    "--force-statusline to replace it.",
                    file=sys.stderr,
                )
            else:
                if not args.dry_run:
                    settings["statusLine"] = {
                        "type": "command",
                        "command": command,
                        "padding": 0,
                        "refreshInterval": 10,
                    }
                registered.append("statusLine")
            continue

        entry = {"type": "command", "command": f"python3 {dst}", "timeout": d["timeout"]}
        if args.dry_run:
            registered.append(f"{d['event']} ({name})")
        else:
            added = merge_hook_group(settings, d["event"], d["matcher"], entry)
            if added:
                registered.append(f"{d['event']} ({name})")
            else:
                skipped_existing.append(f"{d['event']} ({name})")

    if not args.dry_run:
        write_json(settings_path, settings)
        if provided_config:
            write_json(config_path, config, mode=0o600)

    print(f"{'[dry-run] ' if args.dry_run else ''}Installed scripts: {', '.join(installed) or '(none)'}")
    print(f"{'[dry-run] ' if args.dry_run else ''}Registered: {', '.join(registered) or '(none)'}")
    if skipped_existing:
        print(f"Already present, left untouched: {', '.join(skipped_existing)}")


if __name__ == "__main__":
    main()
