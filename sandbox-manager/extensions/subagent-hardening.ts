/**
 * OMP extension: enforce explicit tool whitelists in subagent sessions.
 *
 * omp subagent sessions inherit the parent's MCP connections
 * (`createMCPProxyTools`) and extension set, so without this extension a
 * subagent could call every MCP tool the main session has — including the
 * channel servers (telegram-ng reply, cronjobs, webhooks) — even when its
 * agent definition declares a `tools:` whitelist. This extension strips
 * `mcp__*` tools from subagent sessions (except the documented allowlist):
 *
 *   session_start       — remove MCP tools before the first turn
 *   mcp_notification    — re-strip in case a server's tools/list_changed
 *                         re-activated them mid-session
 *
 * Allowlist: the replicator search/fetch pair is the quarantine agent's
 * deliberate fetch-only grant. Both tools route through the replicator MCP
 * server, which SSRF-guards every request (refuses private, loopback,
 * link-local, and CGNAT targets) before touching the network, so holding
 * them is safe for any subagent. No channel server (telegram-ng reply,
 * cronjobs, webhooks) is ever exempt.
 *
 * A session is a subagent when `yield` is in its active tools: omp only
 * adds the hidden `yield` tool to subagent sessions (`requireYieldTool`,
 * see task/executor.ts), never to a main session.
 *
 * Channel wakes are handled by each channel plugin's `omp-channel.ts`
 * bridge, which applies the same subagent check before waking.
 *
 * Portable: no secrets, chat IDs, or hardcoded paths.
 */
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

/** MCP tools a subagent may keep; everything else with the prefix is stripped. */
const ALLOWED_MCP_TOOLS: Record<string, true> = {
  mcp__replicator_replicator_search: true,
  mcp__replicator_replicator_fetch: true,
};

function stripMcpTools(pi: ExtensionAPI): void {
  const active = pi.getActiveTools();
  const stripped = active.filter(
    (name) => !name.startsWith("mcp__") || ALLOWED_MCP_TOOLS[name] === true,
  );
  if (stripped.length === active.length) return;
  pi.setActiveTools(stripped).catch((error: unknown) => {
    process.stderr.write(
      `subagent-hardening: setActiveTools failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
  });
}

export default function subagentHardening(pi: ExtensionAPI): void {
  pi.on("session_start", () => {
    if (!pi.getActiveTools().includes("yield")) return;
    stripMcpTools(pi);
  });
  pi.on("mcp_notification", () => {
    if (!pi.getActiveTools().includes("yield")) return;
    stripMcpTools(pi);
  });
}
