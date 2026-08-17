#!/usr/bin/env python3
"""
Stop hook: if this turn left uncommitted changes inside a plugin directory
under the plugins repo (anything containing .claude-plugin/plugin.json)
without bumping that plugin's version, block and remind to bump + commit +
push — per CLAUDE.md's Plugin Versioning policy ("bump the plugin version
whenever making changes to a plugin ... commit and push immediately").

Brand-new (untracked) plugin directories are exempt — there's no prior
version to bump from.

Configure the repo path via
~/.claude/channels/sandbox-manager/hooks-config.json key
"plugins_repo_path" (defaults to "/workspace/projects/skills").
"""
import json
import os
import subprocess
import sys

CONFIG_PATH = os.environ.get(
    "SANDBOX_MANAGER_HOOKS_CONFIG",
    os.path.expanduser("~/.claude/channels/sandbox-manager/hooks-config.json"),
)
DEFAULT_REPO_PATH = "/workspace/projects/skills"
VERSION_FILES = ("package.json", ".claude-plugin/plugin.json")


def load_config():
    try:
        with open(CONFIG_PATH) as f:
            return json.load(f)
    except Exception:
        return {}


def git(repo_path, *args):
    return subprocess.run(
        ["git", "-C", repo_path, *args],
        capture_output=True,
        text=True,
        timeout=10,
    )


def read_version_at(repo_path, ref, rel_path):
    result = git(repo_path, "show", f"{ref}:{rel_path}")
    if result.returncode != 0:
        return None
    try:
        return json.loads(result.stdout).get("version")
    except (json.JSONDecodeError, AttributeError):
        return None


def read_version_worktree(repo_path, rel_path):
    try:
        with open(os.path.join(repo_path, rel_path)) as f:
            return json.load(f).get("version")
    except Exception:
        return None


def main():
    try:
        json.load(sys.stdin)
    except Exception:
        pass  # this hook doesn't need the payload, just needs stdin drained

    config = load_config()
    repo_path = config.get("plugins_repo_path", DEFAULT_REPO_PATH)

    if not os.path.isdir(repo_path):
        print(json.dumps({}))
        return

    status = git(repo_path, "status", "--porcelain")
    if status.returncode != 0 or not status.stdout.strip():
        print(json.dumps({}))
        return

    changed_by_plugin = {}
    for line in status.stdout.splitlines():
        rel_path = line[3:].split(" -> ")[-1].strip('"')
        parts = rel_path.split("/", 1)
        if len(parts) != 2:
            continue
        plugin_dir, plugin_rel = parts
        if not os.path.isfile(os.path.join(repo_path, plugin_dir, ".claude-plugin", "plugin.json")):
            continue
        changed_by_plugin.setdefault(plugin_dir, set()).add(plugin_rel)

    needs_bump = []
    for plugin_dir, changed_files in changed_by_plugin.items():
        # Skip plugins with no HEAD history at all (freshly added, never committed).
        head_check = git(repo_path, "cat-file", "-e", f"HEAD:{plugin_dir}/.claude-plugin/plugin.json")
        if head_check.returncode != 0:
            continue

        non_version_changes = changed_files - set(VERSION_FILES)
        if not non_version_changes:
            continue

        bumped = False
        for rel in VERSION_FILES:
            if rel not in changed_files:
                continue
            old = read_version_at(repo_path, "HEAD", f"{plugin_dir}/{rel}")
            new = read_version_worktree(repo_path, f"{plugin_dir}/{rel}")
            if new is not None and new != old:
                bumped = True
                break

        if not bumped:
            needs_bump.append(plugin_dir)

    if needs_bump:
        plugins = ", ".join(sorted(needs_bump))
        print(
            json.dumps(
                {
                    "decision": "block",
                    "reason": (
                        f"Plugin(s) changed without a version bump: {plugins}. "
                        "Per CLAUDE.md's Plugin Versioning policy, bump the "
                        "version in both package.json and "
                        ".claude-plugin/plugin.json, then commit and push "
                        "immediately before finishing this turn."
                    ),
                }
            )
        )
        return

    print(json.dumps({}))


if __name__ == "__main__":
    main()
