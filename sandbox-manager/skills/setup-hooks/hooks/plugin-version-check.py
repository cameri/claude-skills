#!/usr/bin/env python3
"""
Stop hook: if this turn left uncommitted changes inside a plugin directory
under the plugins repo (anything containing .claude-plugin/plugin.json)
without bumping that plugin's version, block and remind to bump + commit +
push — per CLAUDE.md's Plugin Versioning policy ("bump the plugin version
whenever making changes to a plugin ... commit and push immediately").

Brand-new (untracked) plugin directories are exempt — there's no prior
version to bump from.

Also checks a second, related gap: if a plugin's `skills/` directory
gained, lost, or renamed a skill this turn, but neither README.md nor
marketplace.json (both at the repo root) changed alongside it, block and
remind to sync those docs too — per CLAUDE.md's note ("When a plugin
change adds, removes, or renames a skill ... update
projects/skills/README.md and .claude-plugin/marketplace.json in the same
commit"). This is the mechanical backstop that note itself says doesn't
exist yet (caught the hard way in the 2026-08-20 README drift audit).

Configure the repo path via
~/.claude/channels/sandbox-manager/hooks-config.json key
"plugins_repo_path" (defaults to "/workspace/projects/skills").
"""
import json
import os
import re
import subprocess
import sys

CONFIG_PATH = os.environ.get(
    "SANDBOX_MANAGER_HOOKS_CONFIG",
    os.path.expanduser("~/.claude/channels/sandbox-manager/hooks-config.json"),
)
DEFAULT_REPO_PATH = "/workspace/projects/skills"
VERSION_FILES = ("package.json", ".claude-plugin/plugin.json")
DOCS_FILES = ("README.md", ".claude-plugin/marketplace.json")
SKILL_PATH_RE = re.compile(r"^skills/([^/]+)/SKILL\.md$")


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

    docs_changed = False
    changed_by_plugin = {}
    skill_structural_by_plugin = {}
    for line in status.stdout.splitlines():
        code = line[:2]
        new_path = line[3:].split(" -> ")[-1].strip('"')
        if new_path in DOCS_FILES:
            docs_changed = True
        parts = new_path.split("/", 1)
        if len(parts) != 2:
            continue
        plugin_dir, plugin_rel = parts
        if not os.path.isfile(os.path.join(repo_path, plugin_dir, ".claude-plugin", "plugin.json")):
            continue
        changed_by_plugin.setdefault(plugin_dir, set()).add(plugin_rel)
        skill_match = SKILL_PATH_RE.match(plugin_rel)
        if skill_match and any(c in code for c in "ADR?"):
            skill_structural_by_plugin.setdefault(plugin_dir, set()).add(skill_match.group(1))

    needs_bump = []
    needs_docs_sync = []
    for plugin_dir, changed_files in changed_by_plugin.items():
        # Skip plugins with no HEAD history at all (freshly added, never committed).
        head_check = git(repo_path, "cat-file", "-e", f"HEAD:{plugin_dir}/.claude-plugin/plugin.json")
        if head_check.returncode != 0:
            continue

        non_version_changes = changed_files - set(VERSION_FILES)
        if non_version_changes:
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

        if plugin_dir in skill_structural_by_plugin and not docs_changed:
            needs_docs_sync.append(plugin_dir)

    reasons = []
    if needs_bump:
        plugins = ", ".join(sorted(needs_bump))
        reasons.append(
            f"Plugin(s) changed without a version bump: {plugins}. "
            "Per CLAUDE.md's Plugin Versioning policy, bump the "
            "version in both package.json and "
            ".claude-plugin/plugin.json, then commit and push "
            "immediately before finishing this turn."
        )
    if needs_docs_sync:
        plugins = ", ".join(sorted(needs_docs_sync))
        reasons.append(
            f"Plugin(s) changed which skills they ship ({plugins}) but neither "
            "README.md nor .claude-plugin/marketplace.json changed alongside "
            "it. Per CLAUDE.md's skill-drift note, update the plugin's skill "
            "table/slash-command names in README.md (and the marketplace "
            "registration if this is a new plugin) in the same commit."
        )

    if reasons:
        print(json.dumps({"decision": "block", "reason": " ".join(reasons)}))
        return

    print(json.dumps({}))


if __name__ == "__main__":
    main()
