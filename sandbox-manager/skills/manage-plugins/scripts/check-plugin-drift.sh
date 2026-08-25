#!/usr/bin/env bash
# Checks this container's own plugin config for installLocation/version drift:
# a marketplace or plugin installPath that no longer exists on disk, or an
# installed plugin whose recorded version doesn't match the plugin.json
# actually sitting at that installPath. Both symptoms match how a
# cross-container CLAUDE_CONFIG_DIR mistake corrupts config (see this skill's
# SKILL.md essential_principles) — this script catches that drift
# proactively instead of waiting for an update/reload to fail.
set -euo pipefail

CONFIG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
MARKETPLACES_FILE="$CONFIG_DIR/plugins/known_marketplaces.json"
INSTALLED_FILE="$CONFIG_DIR/plugins/installed_plugins.json"

drift_found=0

if [ ! -f "$MARKETPLACES_FILE" ]; then
  echo "No marketplaces file at $MARKETPLACES_FILE — nothing to check." >&2
  exit 0
fi

echo "== Marketplace installLocation check =="
while IFS=$'\t' read -r name location; do
  if [ ! -d "$location" ]; then
    echo "DRIFT: marketplace '$name' installLocation does not exist on this filesystem: $location"
    drift_found=1
  fi
done < <(jq -r 'to_entries[] | "\(.key)\t\(.value.installLocation)"' "$MARKETPLACES_FILE")

if [ -f "$INSTALLED_FILE" ]; then
  echo ""
  echo "== Installed plugin version/path check =="
  while IFS=$'\t' read -r install_path recorded_version; do
    if [ ! -d "$install_path" ]; then
      echo "DRIFT: installPath does not exist on this filesystem: $install_path (recorded version $recorded_version)"
      drift_found=1
      continue
    fi
    plugin_json="$install_path/.claude-plugin/plugin.json"
    if [ ! -f "$plugin_json" ]; then
      # Not every install has its own versioned manifest (e.g. a plain git
      # checkout pinned by commit sha) — the path existing at all is what
      # matters for the cross-container-corruption symptom this checks for,
      # so a missing manifest here is informational, not drift.
      echo "note: no .claude-plugin/plugin.json at $install_path (recorded version $recorded_version) — path exists, skipping version check"
      continue
    fi
    actual_version=$(jq -r '.version // "unknown"' "$plugin_json")
    if [ "$actual_version" != "$recorded_version" ]; then
      echo "DRIFT: $install_path recorded as $recorded_version but plugin.json says $actual_version"
      drift_found=1
    fi
  done < <(jq -r '.plugins | to_entries[] | .value[] | "\(.installPath)\t\(.version)"' "$INSTALLED_FILE")
fi

echo ""
if [ "$drift_found" -eq 0 ]; then
  echo "No drift found."
else
  echo "Drift found — see DRIFT lines above. This does not fix anything; re-run the affected install/update from inside the correct container (see SKILL.md essential_principles)."
fi
exit "$drift_found"
