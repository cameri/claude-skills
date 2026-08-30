#!/usr/bin/env bash
# Sweeps the workspace's own repo plus every standalone repo listed in its
# root CLAUDE.md for uncommitted or unpushed work. The standalone-repo list
# is read from CLAUDE.md itself (not hardcoded here) so this stays portable
# across workspaces with a different repo list.
set -uo pipefail

# Resolve the workspace root from the environment: CLAUDE_PROJECT_DIR (set by
# Claude Code) first, then REPO_HYGIENE_WORKSPACE_ROOT as an explicit
# override. There is no fallback path — if neither is set, fail loudly rather
# than silently sweeping a guessed location.
if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
  WORKSPACE_ROOT="$CLAUDE_PROJECT_DIR"
elif [ -n "${REPO_HYGIENE_WORKSPACE_ROOT:-}" ]; then
  WORKSPACE_ROOT="$REPO_HYGIENE_WORKSPACE_ROOT"
else
  echo "ERROR: cannot determine the workspace root — set CLAUDE_PROJECT_DIR or REPO_HYGIENE_WORKSPACE_ROOT." >&2
  exit 1
fi

CLAUDE_MD="$WORKSPACE_ROOT/CLAUDE.md"
DIRTY_COUNT=0
# Set when the standalone-repo list could not be parsed from CLAUDE.md
# (file missing, or no bullets matching the heading contract).
REPO_LIST_MISSING=0

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
# docs/ is a workspace-specific special case: the workspace CLAUDE.md
# documents it as its own repo under the "### `docs/` is a standalone repo"
# heading, not as a bullet under the Standalone repos heading, so it can't
# be derived from the bullet list. Kept as an always-checked extra repo
# (skipped cleanly when it isn't one).
check_repo "$WORKSPACE_ROOT/docs" "docs/"

echo
echo "== Standalone repos in projects/ (from CLAUDE.md) =="
if [ ! -f "$CLAUDE_MD" ]; then
  echo "SKIP: no CLAUDE.md found at $CLAUDE_MD — cannot enumerate standalone repos"
  REPO_LIST_MISSING=1
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
    REPO_LIST_MISSING=1
  else
    while IFS= read -r rel_path; do
      full_path="$WORKSPACE_ROOT/${rel_path%/}"
      check_repo "$full_path" "$rel_path"
    done <<< "$paths"
  fi
fi

echo
if [ "$DIRTY_COUNT" -gt 0 ]; then
  echo "Result: $DIRTY_COUNT repo(s) have uncommitted or unpushed work (see DIRTY lines above)."
  exit 1
elif [ "$REPO_LIST_MISSING" -eq 1 ]; then
  echo "Result: checked repos are clean, but no standalone repos were parsed from CLAUDE.md (see SKIP lines above) — cannot confirm everything is clean."
  exit 1
else
  echo "Result: everything clean and pushed."
  exit 0
fi
