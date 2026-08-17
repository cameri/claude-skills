#!/usr/bin/env bash
# Sweeps the workspace's own repo plus every standalone repo listed in its
# root CLAUDE.md for uncommitted or unpushed work. The standalone-repo list
# is read from CLAUDE.md itself (not hardcoded here) so this stays portable
# across workspaces with a different repo list.
set -uo pipefail

WORKSPACE_ROOT="${REPO_HYGIENE_WORKSPACE_ROOT:-${CLAUDE_PROJECT_DIR:-/workspace}}"
CLAUDE_MD="$WORKSPACE_ROOT/CLAUDE.md"
DIRTY_COUNT=0

check_repo() {
  local path="$1"
  local label="$2"

  if [ ! -d "$path" ]; then
    echo "SKIP: $label ($path does not exist)"
    return
  fi

  if [ -d "$path/.jj" ]; then
    local st
    st=$(jj -R "$path" status 2>&1)
    if echo "$st" | grep -q "The working copy has no changes."; then
      echo "OK: $label (jj, clean)"
    else
      echo "DIRTY: $label (jj) —"
      echo "$st" | sed 's/^/    /'
      DIRTY_COUNT=$((DIRTY_COUNT + 1))
    fi
  elif [ -d "$path/.git" ]; then
    local short sb
    short=$(git -C "$path" status --short 2>&1)
    sb=$(git -C "$path" status -sb 2>&1 | head -1)
    local ahead
    ahead=$(echo "$sb" | grep -oE 'ahead [0-9]+' || true)
    if [ -z "$short" ] && [ -z "$ahead" ]; then
      echo "OK: $label (git, clean, up to date with remote)"
    else
      echo "DIRTY: $label (git) — $sb"
      [ -n "$short" ] && echo "$short" | sed 's/^/    /'
      DIRTY_COUNT=$((DIRTY_COUNT + 1))
    fi
  else
    echo "SKIP: $label (no .jj or .git found — not a repo root?)"
  fi
}

echo "== Workspace repo =="
check_repo "$WORKSPACE_ROOT" "workspace root"

echo
echo "== docs/ (standalone repo, if present) =="
check_repo "$WORKSPACE_ROOT/docs" "docs/"

echo
echo "== Standalone repos in projects/ (from CLAUDE.md) =="
if [ ! -f "$CLAUDE_MD" ]; then
  echo "SKIP: no CLAUDE.md found at $CLAUDE_MD — set REPO_HYGIENE_WORKSPACE_ROOT to point at the workspace root"
else
  # Extract the bullet list under the "### Standalone repos in `projects/`"
  # heading, stopping at the next heading of the same or higher level.
  paths=$(awk '
    /^### Standalone repos in `projects\/`/ { capture=1; next }
    /^#/ && capture { capture=0 }
    capture && /^- `projects\// { print }
  ' "$CLAUDE_MD" | grep -oE '`projects/[^`]+`' | tr -d '`')

  if [ -z "$paths" ]; then
    echo "SKIP: no standalone-repo bullets found under that heading in CLAUDE.md"
  else
    while IFS= read -r rel_path; do
      full_path="$WORKSPACE_ROOT/${rel_path%/}"
      check_repo "$full_path" "$rel_path"
    done <<< "$paths"
  fi
fi

echo
if [ "$DIRTY_COUNT" -eq 0 ]; then
  echo "Result: everything clean and pushed."
  exit 0
else
  echo "Result: $DIRTY_COUNT repo(s) have uncommitted or unpushed work (see DIRTY lines above)."
  exit 1
fi
