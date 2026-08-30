/**
 * OMP extension: keep ~/.claude/session-status-cache.json fresh for the
 * telegram-ng /usage bot command.
 *
 * Under Claude Code the file is written by statusline-wrapper.py on every
 * statusline render; Claude Code hooks never run under OMP, so /usage saw a
 * stale or missing file after the claude -> omp migration. This extension
 * writes the same file in the exact same shape at session start and after
 * every turn:
 *
 *   context_window  <- ctx.getContextUsage() ({tokens, contextWindow, percent})
 *   rate_limits     <- ctx.modelRegistry.authStorage.fetchUsageReports(),
 *                      mapped from the active provider's UsageReport
 *                      ("5h" window -> five_hour, "7d" -> seven_day).
 *
 * rate_limits are refreshed at most once every 5 minutes (the statusline's
 * own cadence); the underlying per-credential reports are TTL-cached by
 * AuthStorage, so the refresh is a cache hit except on expiry. A failed or
 * slow fetch keeps the previously written buckets — never nulls them out.
 *
 * Observational only: write failures are swallowed, never break a turn.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";

const CACHE_PATH = join(homedir(), ".claude", "session-status-cache.json");
const RATE_LIMIT_REFRESH_MS = 5 * 60_000;

type RateLimitBucket = { used_percentage: number | null; resets_at: number | null };

let lastRateRefreshAt = 0;

function sessionId(ctx: ExtensionContext): string | null {
  try {
    return ctx.sessionManager.getSessionId() ?? null;
  } catch {
    return null;
  }
}

function contextWindow(ctx: ExtensionContext): {
  used_percentage: number | null;
  total_input_tokens: number | null;
  context_window_size: number | null;
} {
  try {
    const usage = ctx.getContextUsage();
    if (!usage) return { used_percentage: null, total_input_tokens: null, context_window_size: null };
    return {
      used_percentage: Math.round(usage.percent * 10) / 10,
      total_input_tokens: usage.tokens,
      context_window_size: usage.contextWindow,
    };
  } catch {
    return { used_percentage: null, total_input_tokens: null, context_window_size: null };
  }
}

/** Map a UsageReport's windows ("5h"/"7d") onto the claude-statusline bucket shape. */
function rateLimitBuckets(report: {
  limits: Array<{
    window: { id: string; resetsAt?: number };
    amount: { used?: number; limit?: number; usedFraction?: number; resetsAt?: number };
  }>;
}): { five_hour: RateLimitBucket; seven_day: RateLimitBucket } | null {
  const bucketFor = (windowId: string): RateLimitBucket | null => {
    const limit = report.limits.find(l => l.window?.id === windowId);
    if (!limit?.window) return null;
    const { amount } = limit;
    const fraction =
      amount.usedFraction ??
      (amount.used !== undefined && amount.limit !== undefined && amount.limit > 0
        ? amount.used / amount.limit
        : undefined);
    const resetsAtMs = limit.window.resetsAt ?? amount.resetsAt;
    return {
      used_percentage: fraction !== undefined ? Math.round(fraction * 1000) / 10 : null,
      resets_at: resetsAtMs !== undefined ? Math.round(resetsAtMs / 1000) : null,
    };
  };
  const five_hour = bucketFor("5h");
  const seven_day = bucketFor("7d");
  if (!five_hour && !seven_day) return null;
  return { five_hour: five_hour ?? { used_percentage: null, resets_at: null }, seven_day: seven_day ?? { used_percentage: null, resets_at: null } };
}

/** Fetch the active provider's usage report (TTL-cached; safe to call often). */
async function fetchRateLimits(ctx: ExtensionContext): Promise<{ five_hour: RateLimitBucket; seven_day: RateLimitBucket } | null> {
  try {
    const provider = ctx.model?.provider;
    if (!provider) return null;
    const reports = await ctx.modelRegistry.authStorage.fetchUsageReports({
      baseUrlResolver: p => ctx.modelRegistry.getProviderBaseUrl(p),
    });
    const report = reports?.find(r => r.provider === provider);
    if (!report) return null;
    return rateLimitBuckets(report);
  } catch {
    return null;
  }
}

function writeCache(ctx: ExtensionContext, rateLimits: ReturnType<typeof rateLimitBuckets>): void {
  try {
    let existing: { rate_limits?: { five_hour?: RateLimitBucket; seven_day?: RateLimitBucket } } = {};
    try {
      existing = JSON.parse(readFileSync(CACHE_PATH, "utf8"));
    } catch {
      // First write or unreadable file — start fresh.
    }
    const prev = existing.rate_limits ?? {};
    const cache = {
      cached_at: Date.now() / 1000,
      session_id: sessionId(ctx),
      context_window: contextWindow(ctx),
      rate_limits: {
        five_hour: rateLimits?.five_hour ?? prev.five_hour ?? { used_percentage: null, resets_at: null },
        seven_day: rateLimits?.seven_day ?? prev.seven_day ?? { used_percentage: null, resets_at: null },
      },
    };
    mkdirSync(dirname(CACHE_PATH), { recursive: true });
    const tmp = `${CACHE_PATH}.tmp-${process.pid}`;
    writeFileSync(tmp, JSON.stringify(cache));
    renameSync(tmp, CACHE_PATH);
  } catch {
    // Observational only — never break a turn on write failure.
  }
}

function maybeRefreshRateLimits(ctx: ExtensionContext): void {
  const now = Date.now();
  if (now - lastRateRefreshAt < RATE_LIMIT_REFRESH_MS) return;
  lastRateRefreshAt = now;
  void fetchRateLimits(ctx).then(rateLimits => {
    if (rateLimits) writeCache(ctx, rateLimits);
  });
}

export default function usageStateWriter(pi: ExtensionAPI): void {
  const refresh = (ctx: ExtensionContext) => {
    writeCache(ctx, null);
    maybeRefreshRateLimits(ctx);
  };
  pi.on("session_start", (_event, ctx) => refresh(ctx));
  pi.on("turn_end", (_event, ctx) => refresh(ctx));
}
