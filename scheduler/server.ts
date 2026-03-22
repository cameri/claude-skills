#!/usr/bin/env bun
/**
 * Claude Code Scheduler Channel Server
 *
 * MCP server that manages scheduled tasks and notifies Claude when they fire.
 * Supports natural language schedule expressions:
 *   "every 3 minutes", "every weekday at 3am", "once in 5 minutes"
 *
 * State: ~/.claude/channels/scheduler/schedules.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Cron } from "croner";

// ── State ─────────────────────────────────────────────────────────────────────

const STATE_DIR = join(homedir(), ".claude", "channels", "scheduler");
const SCHEDULES_FILE = join(STATE_DIR, "schedules.json");

mkdirSync(STATE_DIR, { recursive: true });

interface Schedule {
  id: string;
  task: string;
  expression: string; // cron string or ISO timestamp for once
  type: "cron" | "once";
  created: string;
  nextRun?: string;
}

function loadSchedules(): Schedule[] {
  try {
    return JSON.parse(readFileSync(SCHEDULES_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveSchedules(schedules: Schedule[]): void {
  writeFileSync(SCHEDULES_FILE, JSON.stringify(schedules, null, 2));
}

// ── Natural language parser ───────────────────────────────────────────────────

type Parsed = { type: "cron"; value: string } | { type: "once"; value: string };

function parseTime(s: string): { hour: number; minute: number } | null {
  s = s.trim();
  if (s === "noon") return { hour: 12, minute: 0 };
  if (s === "midnight") return { hour: 0, minute: 0 };
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  let hour = parseInt(m[1]);
  const minute = m[2] ? parseInt(m[2]) : 0;
  const period = m[3]?.toLowerCase();
  if (period === "am" && hour === 12) hour = 0;
  if (period === "pm" && hour !== 12) hour += 12;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

const DAY_NAMES: Record<string, string> = {
  sunday: "0", monday: "1", tuesday: "2", wednesday: "3",
  thursday: "4", friday: "5", saturday: "6",
  sun: "0", mon: "1", tue: "2", wed: "3", thu: "4", fri: "5", sat: "6",
};

export function parseScheduleExpression(expr: string): Parsed | null {
  const e = expr.trim().toLowerCase();

  let m: RegExpMatchArray | null;

  // ── One-time ───────────────────────────────────────────────────────────────

  // "once in N seconds/minutes/hours"
  m = e.match(/^once\s+in\s+(\d+)\s+(seconds?|minutes?|hours?)$/);
  if (m) {
    const n = parseInt(m[1]);
    const unit = m[2];
    const ms = unit.startsWith("second") ? n * 1_000
      : unit.startsWith("minute") ? n * 60_000
      : n * 3_600_000;
    return { type: "once", value: new Date(Date.now() + ms).toISOString() };
  }

  // "in N seconds/minutes/hours"
  m = e.match(/^in\s+(\d+)\s+(seconds?|minutes?|hours?)$/);
  if (m) {
    const n = parseInt(m[1]);
    const unit = m[2];
    const ms = unit.startsWith("second") ? n * 1_000
      : unit.startsWith("minute") ? n * 60_000
      : n * 3_600_000;
    return { type: "once", value: new Date(Date.now() + ms).toISOString() };
  }

  // ── Aliases ────────────────────────────────────────────────────────────────

  if (e === "every minute") return { type: "cron", value: "* * * * *" };
  if (e === "every hour") return { type: "cron", value: "0 * * * *" };
  if (e === "every day" || e === "daily") return { type: "cron", value: "0 0 * * *" };

  // ── Every N units ──────────────────────────────────────────────────────────

  // "every N seconds" (6-field cron with seconds)
  m = e.match(/^every\s+(\d+)\s+seconds?$/);
  if (m) {
    const n = parseInt(m[1]);
    return { type: "cron", value: n === 1 ? "* * * * * *" : `*/${n} * * * * *` };
  }

  // "every N minutes"
  m = e.match(/^every\s+(\d+)\s+minutes?$/);
  if (m) {
    const n = parseInt(m[1]);
    return { type: "cron", value: n === 1 ? "* * * * *" : `*/${n} * * * *` };
  }

  // "every N hours"
  m = e.match(/^every\s+(\d+)\s+hours?$/);
  if (m) {
    const n = parseInt(m[1]);
    return { type: "cron", value: n === 1 ? "0 * * * *" : `0 */${n} * * *` };
  }

  // ── Every day/weekday/weekend at TIME ──────────────────────────────────────

  m = e.match(/^every\s+day\s+at\s+(.+)$/);
  if (m) {
    const t = parseTime(m[1]);
    if (t) return { type: "cron", value: `${t.minute} ${t.hour} * * *` };
  }

  m = e.match(/^every\s+(weekday|weekdays)\s+at\s+(.+)$/);
  if (m) {
    const t = parseTime(m[2]);
    if (t) return { type: "cron", value: `${t.minute} ${t.hour} * * 1-5` };
  }

  m = e.match(/^every\s+(weekend|weekends)\s+at\s+(.+)$/);
  if (m) {
    const t = parseTime(m[2]);
    if (t) return { type: "cron", value: `${t.minute} ${t.hour} * * 0,6` };
  }

  m = e.match(/^every\s+(weekday|weekdays)$/);
  if (m) return { type: "cron", value: "0 0 * * 1-5" };

  m = e.match(/^every\s+(weekend|weekends)$/);
  if (m) return { type: "cron", value: "0 0 * * 0,6" };

  // ── Every named day [at TIME] ──────────────────────────────────────────────

  m = e.match(/^every\s+(\w+)\s+at\s+(.+)$/);
  if (m) {
    const dayNum = DAY_NAMES[m[1]];
    const t = parseTime(m[2]);
    if (dayNum !== undefined && t) {
      return { type: "cron", value: `${t.minute} ${t.hour} * * ${dayNum}` };
    }
  }

  m = e.match(/^every\s+(\w+)$/);
  if (m) {
    const dayNum = DAY_NAMES[m[1]];
    if (dayNum !== undefined) return { type: "cron", value: `0 0 * * ${dayNum}` };
  }

  // ── Raw cron expression (5 or 6 space-separated fields) ───────────────────

  if (/^[\d*/,\-\s]+$/.test(e)) {
    const fields = e.trim().split(/\s+/);
    if (fields.length === 5 || fields.length === 6) {
      return { type: "cron", value: e.trim() };
    }
  }

  return null;
}

// ── Job management ────────────────────────────────────────────────────────────

// Forward declaration — mcp is used inside job callbacks.
let mcp: Server;

type StopHandle = { stop(): void };
const activeJobs = new Map<string, StopHandle>();

function stopJob(id: string): void {
  activeJobs.get(id)?.stop();
  activeJobs.delete(id);
}

function fireNotification(schedule: Schedule): void {
  void mcp.notification({
    method: "notifications/claude/channel",
    params: {
      content: `Scheduled task fired: ${schedule.task}`,
      meta: {
        source: "scheduler",
        schedule_id: schedule.id,
        task: schedule.task,
        type: schedule.type,
        ...(schedule.type === "cron" ? { expression: schedule.expression } : {}),
        fired_at: new Date().toISOString(),
      },
    },
  });
}

function startJob(schedule: Schedule): void {
  stopJob(schedule.id);

  if (schedule.type === "once") {
    const fireAt = new Date(schedule.expression).getTime();
    const delay = fireAt - Date.now();
    if (delay <= 0) {
      // Already past — clean up
      const schedules = loadSchedules().filter(s => s.id !== schedule.id);
      saveSchedules(schedules);
      return;
    }
    const timer = setTimeout(() => {
      fireNotification(schedule);
      const schedules = loadSchedules().filter(s => s.id !== schedule.id);
      saveSchedules(schedules);
      activeJobs.delete(schedule.id);
    }, delay);
    activeJobs.set(schedule.id, { stop: () => clearTimeout(timer) });
  } else {
    const job = new Cron(schedule.expression, { timezone: "UTC" }, () => {
      fireNotification(schedule);
    });
    activeJobs.set(schedule.id, job);
  }
}

// ── MCP Server ────────────────────────────────────────────────────────────────

mcp = new Server(
  { name: "plugin:scheduler", version: "1.0.0" },
  {
    capabilities: { tools: {}, experimental: { "claude/channel": {} } },
    instructions: [
      "You are a task scheduler. You can schedule tasks to run at specific times or intervals.",
      "When a scheduled task fires, you receive a channel notification — act on the task described.",
      "",
      "Tools: add_schedule, list_schedules, remove_schedule, clear_schedules",
      "",
      "Supported schedule expressions:",
      "  once in 5 minutes       — fires once after a delay",
      "  every 3 minutes         — recurring interval",
      "  every hour              — top of every hour",
      "  every day at 9am        — daily at a specific time",
      "  every weekday at 3am    — Mon–Fri at a specific time",
      "  every monday at 10:30am — specific weekday at a time",
      "  every weekend at noon   — Sat+Sun at noon",
      "  <5-field cron>          — raw cron expression",
    ].join("\n"),
  },
);

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "add_schedule",
      description: "Schedule a task to run at a specific time or recurring interval.",
      inputSchema: {
        type: "object",
        properties: {
          task: { type: "string", description: "What to do when the schedule fires (shown in the channel notification)" },
          expression: { type: "string", description: "Natural language schedule: 'every 3 minutes', 'every weekday at 3am', 'once in 5 minutes'; or a raw 5-field cron expression" },
        },
        required: ["task", "expression"],
      },
    },
    {
      name: "list_schedules",
      description: "List all active schedules.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "remove_schedule",
      description: "Remove a schedule by its ID.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Schedule ID to remove" },
        },
        required: ["id"],
      },
    },
    {
      name: "clear_schedules",
      description: "Remove all active schedules.",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = (req.params.arguments ?? {}) as Record<string, string>;

  switch (req.params.name) {
    case "add_schedule": {
      const parsed = parseScheduleExpression(args.expression);
      if (!parsed) {
        return {
          content: [{ type: "text", text: `Cannot parse schedule expression: "${args.expression}". Try "every 3 minutes", "every weekday at 3am", or "once in 5 minutes".` }],
          isError: true,
        };
      }

      const id = randomUUID().slice(0, 8);
      const schedule: Schedule = {
        id,
        task: args.task,
        expression: parsed.value,
        type: parsed.type,
        created: new Date().toISOString(),
      };

      if (parsed.type === "cron") {
        try {
          const probe = new Cron(parsed.value, { paused: true });
          const next = probe.nextRun();
          probe.stop();
          if (next) schedule.nextRun = next.toISOString();
        } catch (e) {
          return { content: [{ type: "text", text: `Invalid cron expression: ${(e as Error).message}` }], isError: true };
        }
      } else {
        schedule.nextRun = parsed.value;
      }

      const schedules = loadSchedules();
      schedules.push(schedule);
      saveSchedules(schedules);
      startJob(schedule);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ id, task: args.task, expression: args.expression, cronExpression: parsed.value, type: parsed.type, nextRun: schedule.nextRun }, null, 2),
        }],
      };
    }

    case "list_schedules": {
      const schedules = loadSchedules();
      if (schedules.length === 0) {
        return { content: [{ type: "text", text: "No active schedules." }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(schedules, null, 2) }] };
    }

    case "remove_schedule": {
      stopJob(args.id);
      const before = loadSchedules();
      const after = before.filter(s => s.id !== args.id);
      if (before.length === after.length) {
        return { content: [{ type: "text", text: `Schedule "${args.id}" not found.` }], isError: true };
      }
      saveSchedules(after);
      return { content: [{ type: "text", text: `Schedule ${args.id} removed.` }] };
    }

    case "clear_schedules": {
      for (const id of activeJobs.keys()) stopJob(id);
      const count = loadSchedules().length;
      saveSchedules([]);
      return { content: [{ type: "text", text: `Cleared ${count} schedule(s).` }] };
    }

    default:
      return { content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }], isError: true };
  }
});

// Connect MCP transport before starting any jobs (no notifications are lost).
await mcp.connect(new StdioServerTransport());

// Load and start persisted schedules.
const existing = loadSchedules();
let loaded = 0;
for (const s of existing) {
  if (s.type === "once" && new Date(s.expression) <= new Date()) continue; // expired
  startJob(s);
  loaded++;
}
process.stderr.write(`scheduler: ${loaded} schedule(s) loaded\n`);

// ── Graceful shutdown ─────────────────────────────────────────────────────────

const shutdown = () => {
  for (const id of activeJobs.keys()) stopJob(id);
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
