# lightning

Wraps the official [Alby MCP server](https://github.com/getAlby/mcp)
(`@getalby/mcp`) to expose Bitcoin Lightning tools — `parse_invoice`,
`pay_invoice`, `get_balance`, `lookup_invoice`, `get_info`, `make_invoice`,
`list_transactions` — over Nostr Wallet Connect (NWC).

## Setup

1. In your NWC-compatible wallet (e.g. a self-hosted Alby Hub instance),
   create a new app connection scoped to just what this needs (typically
   `pay_invoice`, `lookup_invoice`, `get_balance`, `get_info`) with a
   spending budget cap.
2. Save the resulting connection string:

   ```sh
   mkdir -p ~/.claude/channels/lightning
   cat > ~/.claude/channels/lightning/.env <<'EOF'
   NWC_CONNECTION_STRING=nostr+walletconnect://...
   EOF
   chmod 600 ~/.claude/channels/lightning/.env
   ```

The connection string is a wallet secret — it is never committed to this
repo and is read at MCP-server startup by `bin/run.sh`, following the same
pattern as `containers/alby-hub/compose.yml`'s SOPS sidecar.

## Policy

Actually paying an invoice is gated by the workspace's Lightning Payment
Policy (see root `CLAUDE.md`) and mechanically backstopped by the
`pay-invoice-guard` PreToolUse hook (`sandbox-manager:setup-hooks`), which
refuses any `pay_invoice` call unless the current turn's most recent
inbound message came from the configured authorized Telegram chat.
