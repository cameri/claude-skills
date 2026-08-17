#!/bin/sh
# .mcp.json can't declare a secret-bearing env block for a plugin-spawned
# server, so credentials are loaded here instead, same idiom as
# containers/alby-hub/compose.yml's sops entrypoint.
ENV_FILE="$HOME/.claude/channels/lightning/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "lightning plugin: missing $ENV_FILE (needs NWC_CONNECTION_STRING=nostr+walletconnect://...)" >&2
  exit 1
fi
set -a
. "$ENV_FILE"
set +a
exec npx -y @getalby/mcp
