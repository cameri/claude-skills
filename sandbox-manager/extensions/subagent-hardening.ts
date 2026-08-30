/**
 * OMP extension: enforce explicit tool whitelists in subagent sessions.
 *
 * omp subagent sessions inherit the parent's MCP connections
 * (`createMCPProxyTools`) and extension set, so without this extension a
 * subagent could call every MCP tool the main session has — including the
 * channel servers (telegram-ng reply, cronjobs, webhooks) — even when its
 * agent definition declares a `tools:` whitelist. This extension strips
 * every `mcp__*` tool from subagent sessions:
 *
 *   session_start       — remove MCP tools before the first turn
 *   mcp_notification    — re-strip in case a server's tools/list_changed
 *                         re-activated them mid-session
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

/** MCP tools carry the `mcp__<server>_<tool>` prefix. */
function isMcpToolName(name: string): boolean {
  return name.startsWith("mcp__");
}

function isSubagentSession(pi: ExtensionAPI): boolean {
  return pi.getActiveTools().includes("yield");
}

function stripMcpTools(pi: ExtensionAPI): void {
  const active = pi.getActiveTools();
  const stripped = active.filter((name) => !isMcpToolName(name));
  if (stripped.length === active.length) return;
  pi.setActiveTools(stripped).catch((error: unknown) => {
    process.stderr.write(
      `subagent-hardening: setActiveTools failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
  });
}

export default function subagentHardening(pi: ExtensionAPI): void {
  pi.on("session_start", () => {
    if (!isSubagentSession(pi)) return;
    stripMcpTools(pi);
  });
  pi.on("mcp_notification", () => {
    if (!isSubagentSession(pi)) return;
    stripMcpTools(pi);
  });
}
