#!/usr/bin/env bash
# Health checks that only matter right after a container/session restart —
# each check here corresponds to a failure mode that has actually recurred
# in this workspace after a restart (see the skill's SKILL.md for evidence).
set -uo pipefail

FAIL=0

echo "== SSH commit-signing key =="
SIGNING_KEY="${SSH_SIGNING_KEY:-$HOME/.ssh/id_ed25519}"
if [ ! -f "$SIGNING_KEY" ]; then
  echo "SKIP: no private key at $SIGNING_KEY"
elif [ ! -f "${SIGNING_KEY}.pub" ]; then
  echo "MISSING: ${SIGNING_KEY}.pub is gone — regenerating from the private key"
  if ssh-keygen -y -f "$SIGNING_KEY" > "${SIGNING_KEY}.pub" 2>/dev/null; then
    echo "FIXED: regenerated ${SIGNING_KEY}.pub"
  else
    echo "FAIL: could not regenerate ${SIGNING_KEY}.pub — check the private key isn't corrupted"
    FAIL=1
  fi
else
  DERIVED=$(ssh-keygen -y -f "$SIGNING_KEY" 2>/dev/null)
  STORED=$(cat "${SIGNING_KEY}.pub")
  if [ "$DERIVED" = "$STORED" ]; then
    echo "OK: ${SIGNING_KEY}.pub matches the private key"
  else
    echo "MISMATCH: ${SIGNING_KEY}.pub does not derive from the private key — regenerating"
    if ssh-keygen -y -f "$SIGNING_KEY" > "${SIGNING_KEY}.pub" 2>/dev/null; then
      echo "FIXED: regenerated ${SIGNING_KEY}.pub"
    else
      echo "FAIL: could not regenerate ${SIGNING_KEY}.pub"
      FAIL=1
    fi
  fi
fi

echo
echo "== Docker Buildx =="
if command -v docker >/dev/null 2>&1; then
  if docker buildx version >/dev/null 2>&1; then
    echo "OK: $(docker buildx version)"
  else
    echo "FAIL: 'docker buildx version' failed — the docker-buildx-plugin package is likely missing from this image"
    FAIL=1
  fi
else
  echo "SKIP: no docker CLI on PATH"
fi

echo
echo "== Ad-hoc pip installs vs. Containerfile =="
CONTAINERFILE="${POST_RESTART_CHECK_CONTAINERFILE:-}"
if [ -z "$CONTAINERFILE" ]; then
  for candidate in \
    "${CLAUDE_PROJECT_DIR:-}/containers/claude/Containerfile" \
    "/workspace/containers/claude/Containerfile"; do
    if [ -n "$candidate" ] && [ -f "$candidate" ]; then
      CONTAINERFILE="$candidate"
      break
    fi
  done
fi
if [ -z "$CONTAINERFILE" ] || [ ! -f "$CONTAINERFILE" ]; then
  echo "SKIP: no Containerfile found (set POST_RESTART_CHECK_CONTAINERFILE to point at one)"
elif ! command -v pip >/dev/null 2>&1 && ! command -v pip3 >/dev/null 2>&1; then
  echo "SKIP: no pip/pip3 on PATH"
else
  PIP_BIN=$(command -v pip3 || command -v pip)
  DECLARED=$(grep -oE 'pip3? install[^&|]*' "$CONTAINERFILE" \
    | grep -oE '[A-Za-z0-9_.-]+(==[A-Za-z0-9_.-]+)?' \
    | grep -v '^-' \
    | grep -vE '^(pip3?|install)$' \
    | sort -u)
  if [ -z "$DECLARED" ]; then
    echo "SKIP: no 'pip install' lines found in $CONTAINERFILE"
  else
    INSTALLED=$("$PIP_BIN" list --format=freeze 2>/dev/null | cut -d= -f1 | tr 'A-Z' 'a-z' | sort -u)
    MISSING=""
    while IFS= read -r pkg; do
      pkg_lower=$(echo "$pkg" | cut -d= -f1 | tr 'A-Z' 'a-z')
      if ! echo "$INSTALLED" | grep -qxF -- "$pkg_lower"; then
        MISSING="${MISSING}${pkg}\n"
      fi
    done <<< "$DECLARED"
    if [ -z "$MISSING" ]; then
      echo "OK: every package the Containerfile declares is present"
    else
      echo "FAIL: declared in $CONTAINERFILE but not currently installed (ad-hoc install likely vanished on rebuild):"
      printf '%b' "$MISSING" | sed 's/^/  - /'
      FAIL=1
    fi
  fi
fi

echo
if [ "$FAIL" -ne 0 ]; then
  echo "Result: one or more checks need attention (see FAIL/MISMATCH lines above)."
  exit 1
else
  echo "Result: all checks passed."
  exit 0
fi
