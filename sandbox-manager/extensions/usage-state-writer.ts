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
 *   omp             <- `omp stats -j` aggregation (the harness's own
 *                      usage/cost ledger: requests, tokens, cache rate,
 *                      savings, total cost, per-model breakdown), so /usage
 *                      shows omp's real spend, not just the provider bands.
 *
 * rate_limits are refreshed at most once every 5 minutes (the statusline's
 * own cadence); the underlying per-credential reports are TTL-cached by
 * AuthStorage, so the refresh is a cache hit except on expiry. omp stats
 * are refreshed on the same 5-minute cadence — `omp stats -j` re-syncs
 * session files (~1-2s), so it must not run on every turn. A failed or slow
 * fetch keeps the previously written buckets — never nulls them out.
 *
 * Observational only: write failures are swallowed, never break a turn.
 */
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";

const CACHE_PATH = join(homedir(), ".claude", "session-status-cache.json");
const RATE_LIMIT_REFRESH_MS = 5 * 60_000;
const OMP_STATS_REFRESH_MS = 5 * 60_000;
const OMP_STATS_TIMEOUT_MS = 25_000;

type RateLimitBucket = { used_percentage: number | null; resets_at: number | null };
type RateLimits = { five_hour: RateLimitBucket; seven_day: RateLimitBucket };

type OmpStats = {
  overall: {
    totalRequests: number;
    failedRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCacheReadTokens: number;
    cacheRate: number;
    cacheSavings: number;
    totalCost: number;
    totalPremiumRequests: number;
  };
  byModel: Array<{
    model: string;
    provider: string;
    totalRequests: number;
    totalCost: number;
    totalInputTokens: number;
    totalOutputTokens: number;
  }>;
};

let lastRateRefreshAt = 0;
let lastOmpStatsAt = 0;

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
}): RateLimits | null {
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
async function fetchRateLimits(ctx: ExtensionContext): Promise<RateLimits | null> {
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

/**
 * Fetch the harness's own usage/cost from `omp stats -j`. The command prints
 * a "Syncing session files..." status line to stdout before the JSON, so the
 * payload is parsed from the first `{` rather than the raw top. Never throws.
 */
async function fetchOmpStats(): Promise<OmpStats | null> {
  try {
    const stdout = await new Promise<string>((resolve, reject) => {
      execFile(
        "omp",
        ["stats", "-j"],
        { timeout: OMP_STATS_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 },
        (err, out) => (err ? reject(err) : resolve(out)),
      );
    });
    const start = stdout.indexOf("{");
    if (start < 0) return null;
    const parsed = JSON.parse(stdout.slice(start)) as OmpStats;
    if (!parsed?.overall) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(ctx: ExtensionContext, rateLimits: RateLimits | null): void {
  try {
    let existing: {
      rate_limits?: RateLimits;
      omp?: { overall?: OmpStats["overall"]; byModel?: OmpStats["byModel"]; stats_at?: number };
    } = {};
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
      // Carried over unchanged — refreshed by writeOmp() on its own cadence.
      omp: existing.omp ?? null,
    };
    mkdirSync(dirname(CACHE_PATH), { recursive: true });
    const tmp = `${CACHE_PATH}.tmp-${process.pid}`;
    writeFileSync(tmp, JSON.stringify(cache));
    renameSync(tmp, CACHE_PATH);
  } catch {
    // Observational only — never break a turn on write failure.
  }
}

/** Update only the `omp` block, preserving context/rate_limits in the file. */
function writeOmp(ompStats: OmpStats): void {
  try {
    let existing: Record<string, unknown> = {};
    try {
      existing = JSON.parse(readFileSync(CACHE_PATH, "utf8"));
    } catch {
      // First write or unreadable file — start fresh.
    }
    const cache = {
      ...existing,
      omp: { overall: ompStats.overall, byModel: ompStats.byModel, stats_at: Date.now() / 1000 },
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

function maybeRefreshOmpStats(): void {
  const now = Date.now();
  if (now - lastOmpStatsAt < OMP_STATS_REFRESH_MS) return;
  lastOmpStatsAt = now;
  void fetchOmpStats().then(ompStats => {
    if (ompStats) writeOmp(ompStats);
  });
}

export default function usageStateWriter(pi: ExtensionAPI): void {
  const refresh = (ctx: ExtensionContext) => {
    writeCache(ctx, null);
    maybeRefreshRateLimits(ctx);
    maybeRefreshOmpStats();
  };
  pi.on("session_start", (_event, ctx) => refresh(ctx));
  pi.on("turn_end", (_event, ctx) => refresh(ctx));
}