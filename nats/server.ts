#!/usr/bin/env bun
/**
 * Claude Code NATS Channel Server
 *
 * MCP server that bridges Claude Code to a NATS agent network. Inbound NATS
 * messages trigger channel notifications to Claude. Claude can message, ping,
 * and discover other agents via MCP tools.
 *
 * Config: ~/.claude/channels/nats/.env  (NATS_URL, NATS_AGENT_NAME)
 * Agent ID: ~/.claude/skills/nats/agent-id  (stable across restarts)
 * Agent cache: ~/.claude/channels/nats/agents.json
 *
 * Subject hierarchy:
 *   claude.agents.<agent-id>.inbox   — direct message delivery
 *   claude.agents.<agent-id>.ping    — liveness check (request/reply)
 *   claude.discovery.ping            — "who's there?" broadcast
 *   claude.discovery.pong            — replies to a discovery ping
 *   claude.discovery.announce        — agent announces on join
 */

import { connect, StringCodec, type NatsConnection } from "nats";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// ── Config ────────────────────────────────────────────────────────────────────

const STATE_DIR = join(homedir(), ".claude", "channels", "nats");
const ENV_FILE = join(STATE_DIR, ".env");
const SKILL_DIR = join(homedir(), ".claude", "skills", "nats");
const AGENT_ID_FILE = join(SKILL_DIR, "agent-id");
const AGENTS_CACHE = join(STATE_DIR, "agents.json");
const SESSIONS_DIR = join(homedir(), ".claude", "sessions");

// Load ~/.claude/channels/nats/.env into process.env. Real env wins.
try {
  for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
    const m = line.match(/^(\w+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
} catch {}

const PRIMARY_URL = process.env.NATS_URL ?? "nats://nats:4222";
const FALLBACK_URL = "nats://nats-server:4222";

// ── Agent identity ────────────────────────────────────────────────────────────

function getAgentId(): string {
  if (existsSync(AGENT_ID_FILE)) return readFileSync(AGENT_ID_FILE, "utf-8").trim();
  mkdirSync(SKILL_DIR, { recursive: true });
  const id = `claude-${randomUUID().slice(0, 8)}`;
  writeFileSync(AGENT_ID_FILE, id);
  return id;
}

const agentId = getAgentId();

/**
 * Friendly display name, resolved fresh on every use (not cached at startup)
 * so a `/rename` picked up mid-session shows up on the next message without
 * restarting the channel server. Precedence: explicit NATS_AGENT_NAME env
 * override, then this Claude Code session's own display name (set via
 * `/rename`, read from ~/.claude/sessions/<parent-pid>.json), then the bare
 * agent ID.
 */
function getAgentName(): string {
  if (process.env.NATS_AGENT_NAME) return process.env.NATS_AGENT_NAME;
  try {
    const sessionFile = join(SESSIONS_DIR, `${process.ppid}.json`);
    const session = JSON.parse(readFileSync(sessionFile, "utf-8")) as { name?: string };
    if (session.name) return session.name;
  } catch {}
  return agentId;
}

// ── Agent cache ───────────────────────────────────────────────────────────────

interface AgentInfo {
  agentId: string;
  name: string;
  lastSeen: string;
}

function loadCache(): Record<string, AgentInfo> {
  try {
    return JSON.parse(readFileSync(AGENTS_CACHE, "utf-8"));
  } catch {
    return {};
  }
}

function updateAgentCache(id: string, info: Partial<AgentInfo>): void {
  mkdirSync(STATE_DIR, { recursive: true });
  const cache = loadCache();
  cache[id] = { ...(cache[id] ?? {}), ...info, lastSeen: new Date().toISOString() } as AgentInfo;
  writeFileSync(AGENTS_CACHE, JSON.stringify(cache, null, 2));
}

// ── Message envelope ──────────────────────────────────────────────────────────

function envelope(type: string, payload: unknown): string {
  return JSON.stringify({
    schema: "1.0",
    from: agentId,
    fromName: getAgentName(),
    inbox: `claude.agents.${agentId}.inbox`,
    ts: new Date().toISOString(),
    type,
    payload,
  });
}

function decodeMsg(data: Uint8Array, sc: ReturnType<typeof StringCodec>): unknown {
  try {
    return JSON.parse(sc.decode(data));
  } catch {
    return null;
  }
}

// ── MCP Server ────────────────────────────────────────────────────────────────

const mcp = new Server(
  { name: "plugin:nats", version: "1.0.0" },
  {
    capabilities: { tools: {}, experimental: { "claude/channel": {} } },
    instructions: [
      `You are connected to a NATS agent network as agent ${agentId} ("${getAgentName()}").`,
      "",
      "When another agent messages or pings you, you receive a channel notification.",
      "Use the tools below to interact with the network:",
      "  message(to, text)              — send a free-form message to another agent by ID",
      "  ping(to, timeout_ms?)          — liveness check against one known agent",
      "  discover(timeout_ms?)          — broadcast \"who's there?\", collect responses",
      "  get_agents()                   — list known agents from local cache",
      "",
      `Your inbox subject: claude.agents.${agentId}.inbox`,
      "Agent cache is stored at ~/.claude/channels/nats/agents.json.",
      "Run /nats:access to change the NATS server URL or this agent's display name.",
    ].join("\n"),
  },
);

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "message",
      description: "Send a free-form message to another agent by ID. They're told your name and agent ID so they can reply.",
      inputSchema: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient's agent ID" },
          text: { type: "string", description: "Message text" },
        },
        required: ["to", "text"],
      },
    },
    {
      name: "ping",
      description: "Send a liveness check to one known agent and wait for a pong.",
      inputSchema: {
        type: "object",
        properties: {
          to: { type: "string", description: "Target agent ID" },
          timeout_ms: { type: "number", description: "Timeout in ms (default: 5000)" },
        },
        required: ["to"],
      },
    },
    {
      name: "discover",
      description: "Broadcast \"who's there?\" and collect responses from every agent on the network.",
      inputSchema: {
        type: "object",
        properties: {
          timeout_ms: { type: "number", description: "Collection window in ms (default: 3000)" },
        },
      },
    },
    {
      name: "get_agents",
      description: "Return the list of known agents from the local cache.",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

// nc is assigned after NATS connects. Tools that need it return an error if not ready.
let nc: NatsConnection | null = null;
const sc = StringCodec();

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = (req.params.arguments ?? {}) as Record<string, unknown>;

  if (req.params.name !== "get_agents" && !nc) {
    return { content: [{ type: "text", text: "NATS not connected — check /nats:access" }], isError: true };
  }

  try {
    switch (req.params.name) {
      case "message": {
        const to = args.to as string;
        nc!.publish(`claude.agents.${to}.inbox`, sc.encode(envelope("message", { text: args.text })));
        return { content: [{ type: "text", text: `Message sent to ${to}. Replies arrive as channel notifications.` }] };
      }

      case "ping": {
        const to = args.to as string;
        const timeout = (args.timeout_ms as number | undefined) ?? 5_000;
        const start = Date.now();
        const resp = await nc!.request(`claude.agents.${to}.ping`, sc.encode(envelope("ping", {})), { timeout });
        const data = decodeMsg(resp.data, sc) as any;
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ agentId: data?.from, name: data?.fromName, rttMs: Date.now() - start }, null, 2),
          }],
        };
      }

      case "discover": {
        const timeout = (args.timeout_ms as number | undefined) ?? 3_000;
        const agents: Record<string, unknown> = {};
        const sub = nc!.subscribe("claude.discovery.pong");
        const collecting = (async () => {
          for await (const m of sub) {
            const data = decodeMsg(m.data, sc) as any;
            if (data?.from && data.from !== agentId) {
              agents[data.from] = { name: data.fromName, lastSeen: new Date().toISOString() };
              updateAgentCache(data.from, { agentId: data.from, name: data.fromName });
            }
          }
        })();
        nc!.publish("claude.discovery.ping", sc.encode(envelope("ping", {})));
        await new Promise((r) => setTimeout(r, timeout));
        sub.unsubscribe();
        await collecting.catch(() => {});
        return { content: [{ type: "text", text: JSON.stringify(agents, null, 2) }] };
      }

      case "get_agents": {
        return { content: [{ type: "text", text: JSON.stringify(loadCache(), null, 2) }] };
      }

      default:
        return { content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }], isError: true };
    }
  } catch (e) {
    return { content: [{ type: "text", text: (e as Error).message }], isError: true };
  }
});

// Connect MCP transport before doing anything that might fire notifications.
await mcp.connect(new StdioServerTransport());

// ── NATS connection ───────────────────────────────────────────────────────────

async function connectNats(): Promise<NatsConnection> {
  const urls = PRIMARY_URL === FALLBACK_URL ? [PRIMARY_URL] : [PRIMARY_URL, FALLBACK_URL];
  let lastErr: unknown;
  for (const url of urls) {
    try {
      const conn = await connect({ servers: url });
      process.stderr.write(`nats: connected to ${url}\n`);
      return conn;
    } catch (e) {
      process.stderr.write(`nats: could not connect to ${url}: ${(e as Error).message}\n`);
      lastErr = e;
    }
  }
  throw lastErr;
}

try {
  nc = await connectNats();
} catch (e) {
  process.stderr.write(`nats: failed to connect — ${(e as Error).message}\n`);
  // Keep MCP server alive so tools can report the error gracefully.
}

if (nc) {
  const nnc = nc; // narrowed non-null ref for async closures

  // Inbox: claude.agents.<id>.inbox — free-form message from another agent
  const inboxSub = nnc.subscribe(`claude.agents.${agentId}.inbox`);
  (async () => {
    for await (const msg of inboxSub) {
      const data = decodeMsg(msg.data, sc) as any;
      if (data?.from === agentId) continue;
      updateAgentCache(data?.from, { agentId: data?.from, name: data?.fromName });
      void mcp.notification({
        method: "notifications/claude/channel",
        params: {
          content: data?.payload?.text ?? "Message from agent",
          meta: {
            source: "nats",
            event_type: "agent_message",
            from: data?.from ?? "unknown",
            from_name: data?.fromName ?? "unknown",
            inbox: data?.inbox ?? `claude.agents.${data?.from}.inbox`,
            ts: new Date().toISOString(),
          },
        },
      });
    }
  })().catch(console.error);

  // Ping: claude.agents.<id>.ping — respond directly with a pong
  const pingSub = nnc.subscribe(`claude.agents.${agentId}.ping`);
  (async () => {
    for await (const msg of pingSub) {
      if (msg.reply) nnc.publish(msg.reply, sc.encode(envelope("pong", {})));
    }
  })().catch(console.error);

  // Discovery ping — respond with our identity
  const discoveryPingSub = nnc.subscribe("claude.discovery.ping");
  (async () => {
    for await (const _msg of discoveryPingSub) {
      nnc.publish("claude.discovery.pong", sc.encode(envelope("pong", {})));
    }
  })().catch(console.error);

  // Discovery pong — passively update agent cache even outside an active discover() call
  const pongSub = nnc.subscribe("claude.discovery.pong");
  (async () => {
    for await (const msg of pongSub) {
      const data = decodeMsg(msg.data, sc) as any;
      if (data?.from && data.from !== agentId) {
        updateAgentCache(data.from, { agentId: data.from, name: data.fromName });
      }
    }
  })().catch(console.error);

  // Discovery announce — record joining agents and notify Claude
  const announceSub = nnc.subscribe("claude.discovery.announce");
  (async () => {
    for await (const msg of announceSub) {
      const data = decodeMsg(msg.data, sc) as any;
      if (!data?.from || data.from === agentId) continue;
      updateAgentCache(data.from, { agentId: data.from, name: data.fromName });
      void mcp.notification({
        method: "notifications/claude/channel",
        params: {
          content: `Agent joined: ${data.fromName} (${data.from})`,
          meta: {
            source: "nats",
            event_type: "agent_joined",
            agent_id: data.from,
            agent_name: data.fromName,
            ts: new Date().toISOString(),
          },
        },
      });
    }
  })().catch(console.error);

  // Announce self and seed cache
  nnc.publish("claude.discovery.announce", sc.encode(envelope("announce", {})));
  updateAgentCache(agentId, { agentId, name: getAgentName() });
  process.stderr.write(`nats: agent ${agentId} ("${getAgentName()}") ready\n`);

  nnc.closed().then(() => {
    process.stderr.write("nats: connection closed\n");
  }).catch(() => {});
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────

const shutdown = async () => {
  try { await nc?.drain(); } catch {}
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
