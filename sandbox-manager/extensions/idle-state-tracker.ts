/**
 * OMP extension: record "last activity" for the telegram-ng idle sentinel.
 *
 * Port of the `setup-hooks` skill's `idle-state-tracker.py` Claude Code Stop
 * hook. Claude Code hooks never run under OMP, so after the claude -> omp
 * migration the sentinel's state file went stale and the bot started asking
 * "Still going, or done for now?" on every allowlisted chat (and right at
 * session start). This extension writes the same state file after every
 * turn and at session start:
 *
 *   ~/.claude/channels/telegram-ng/idle-state.json
 *
 * ...in the exact shape telegram-ng's server.ts idle sentinel reads
 * (IDLE_STATE_DIR / IDLE_STATE_FILE, IdleState). `last_chat_id` is tracked
 * from inbound channel notifications (meta.chat_id) so the sentinel targets
 * the chat that actually talked instead of broadcasting to the allowlist.
 *
 * Observational only: write failures are swallowed, never break a turn.
 *
 * Portable: no secrets or hardcoded paths (honors TELEGRAM_NG_STATE_DIR,
 * same env the sentinel honors).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";

const STATE_DIR = process.env.TELEGRAM_NG_STATE_DIR ?? join(homedir(), ".claude", "channels", "telegram-ng");
const STATE_FILE = join(STATE_DIR, "idle-state.json");

interface IdleState {
  last_activity_iso: string;
  last_activity_ms: number;
  idle_safe: boolean;
  session_id: string | null;
  last_chat_id: string | null;
}

let lastChatId: string | null = null;

function writeState(sessionId: string | null): void {
  const nowMs = Date.now();
  const state: IdleState = {
    last_activity_iso: new Date(nowMs).toISOString(),
    last_activity_ms: nowMs,
    idle_safe: true,
    session_id: sessionId,
    last_chat_id: lastChatId,
  };
  try {
    mkdirSync(STATE_DIR, { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch {
    // Observational only — never break a turn on write failure.
  }
}

function sessionId(ctx: ExtensionContext): string | null {
  try {
    return ctx.sessionManager.getSessionId() ?? null;
  } catch {
    return null;
  }
}

export default function idleStateTracker(pi: ExtensionAPI): void {
  pi.on("session_start", (_event, ctx) => writeState(sessionId(ctx)));
  pi.on("turn_end", (_event, ctx) => writeState(sessionId(ctx)));
  pi.on("mcp_notification", (event) => {
    if (event.method !== "notifications/claude/channel") return;
    const meta = (event.params as { meta?: Record<string, unknown> } | undefined)?.meta;
    if (meta && typeof meta.chat_id === "string") lastChatId = meta.chat_id;
  });
}
