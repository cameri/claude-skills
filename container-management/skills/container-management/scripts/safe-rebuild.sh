#!/usr/bin/env bash
# Renders a docker-compose service with the *real* host $HOME (not this
# container's own) before building/recreating it, and refuses to self-target
# the container currently running this script.
#
# See references/update-strategies.md's <self_rebuild_gotcha> for the failure
# mode this exists to prevent: ${HOME}-style compose variables resolving
# against whatever process invokes `docker compose`, not the real host,
# which silently produces empty disconnected bind mounts instead of erroring.
set -euo pipefail

usage() {
  cat >&2 <<'EOF'
Usage: safe-rebuild.sh [--host-home <path>] [--compose-dir <dir>] <service>

--compose-dir must be the project directory whose compose.yml resolves the
service — for a multi-file setup that uses top-level `include:` and shared
networks (e.g. this workspace's containers/ tree), that's the directory
holding the top-level compose.yml, not a per-service subdirectory; running
against a subdirectory alone can fail with an "undefined network" error.
EOF
  exit 1
}

HOST_HOME=""
COMPOSE_DIR="."
SERVICE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --host-home) HOST_HOME="$2"; shift 2 ;;
    --compose-dir) COMPOSE_DIR="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) SERVICE="$1"; shift ;;
  esac
done

[ -n "$SERVICE" ] || usage

if [ -z "$HOST_HOME" ]; then
  # Self-inspect this container's own mounts: they're already correctly
  # resolved against the real host (Docker mounted them at container start,
  # not at this script's invocation time), so the most common /home/<user>
  # prefix among them is a reliable stand-in for the real host $HOME.
  SELF_ID="$(hostname)"
  HOST_HOME="$(docker inspect "$SELF_ID" --format '{{range .Mounts}}{{.Source}}{{"\n"}}{{end}}' 2>/dev/null \
    | grep -oE '^/home/[^/]+' | sort | uniq -c | sort -rn | head -1 | awk '{print $2}')"
  if [ -z "$HOST_HOME" ]; then
    echo "Could not auto-detect the real host \$HOME from this container's own mounts." >&2
    echo "Pass it explicitly: $0 --host-home /home/<user> $SERVICE" >&2
    exit 1
  fi
  echo "Auto-detected host HOME: $HOST_HOME (from this container's own mount sources)" >&2
fi

# Compare container IDs, not names: a container's `docker inspect` Name can
# carry a runtime prefix (e.g. a hostname-derived collision suffix) that
# doesn't match its compose-file `container_name`, so name comparison alone
# can silently miss a real self-target. `docker compose ps -q` resolves the
# service the same way `up`/`--build` would, from the same project context.
SELF_ID="$(docker inspect "$(hostname)" --format '{{.Id}}' 2>/dev/null)"
TARGET_ID="$(HOME="$HOST_HOME" docker compose --project-directory "$COMPOSE_DIR" ps -q "$SERVICE" 2>/dev/null || true)"

if [ -n "$TARGET_ID" ] && [ -n "$SELF_ID" ] && [ "$TARGET_ID" = "$SELF_ID" ]; then
  cat >&2 <<EOF
Refusing: '$SERVICE' is the container currently running this script —
recreating it would tear down this very process. Hand this to a human at
a real host shell instead:

  cd $COMPOSE_DIR
  HOME=$HOST_HOME docker compose config > /tmp/resolved-$SERVICE.yml
  docker compose -f /tmp/resolved-$SERVICE.yml up -d --build $SERVICE
EOF
  exit 2
fi

RESOLVED="/tmp/resolved-${SERVICE}-$$.yml"
echo "Rendering compose config with HOME=$HOST_HOME -> $RESOLVED" >&2
HOME="$HOST_HOME" docker compose --project-directory "$COMPOSE_DIR" config > "$RESOLVED"

echo "Applying with this session's own environment (docker/buildx need their own \$HOME)..." >&2
docker compose -f "$RESOLVED" up -d --build "$SERVICE"

echo "Done. Rendered config left at $RESOLVED for inspection." >&2
