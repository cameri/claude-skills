#!/usr/bin/env bun
/**
 * Claude Code NATS Channel Server
 *
 * MCP server that bridges Claude Code to a NATS agent network.
 * Inbound NATS messages trigger channel notifications to Claude.
 * Claude can publish, request, broadcast, and discover agents via MCP tools.
 *
 * Config: ~/.claude/channels/nats/.env  (NATS_URL)
 * Agent ID: ~/.claude/skills/nats/agent-id  (stable across restarts)
 * Agent cache: ~/.claude/channels/nats/agents.json
 *
 * Subject hierarchy:
 *   claude.agents.<agent-id>.invoke.<cap>   — direct invocation (inbound)
 *   claude.agents.broadcast.<cap>           — broadcast to all agents
 *   claude.discovery.announce               — agent joins network
 *   claude.discovery.ping                   — discovery ping (reply on pong)
 *   claude.discovery.pong                   — discovery pong responses
 */

import { connect, createInbox, StringCodec, type NatsConnection } from "nats";
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

// ── Agent cache ───────────────────────────────────────────────────────────────

interface Capability {
  type: "tool" | "skill" | "command";
  name: string;
  description: string;
}

interface AgentInfo {
  agentId: string;
  name: string;
  capabilities: Capability[];
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

function envelope(from: string, type: string, payload: unknown): string {
  return JSON.stringify({ schema: "1.0", from, ts: new Date().toISOString(), type, payload });
}

function decodeMsg(data: Uint8Array, sc: ReturnType<typeof StringCodec>): unknown {
  try {
    return JSON.parse(sc.decode(data));
  } catch {
    return null;
  }
}

// ── Capabilities ──────────────────────────────────────────────────────────────

function getCapabilities(): Capability[] {
  return [
    { type: "skill", name: "nats:configure", description: "Configure the NATS server URL" },
    { type: "skill", name: "nats:status", description: "Show NATS agent status and known agents" },
    { type: "skill", name: "nats:discover", description: "Discover all NATS agents and their capabilities" },
    { type: "skill", name: "nats:call", description: "Invoke a capability on a specific agent" },
    { type: "skill", name: "nats:broadcast", description: "Broadcast a capability call to all agents" },
  ];
}

// ── MCP Server ────────────────────────────────────────────────────────────────

const mcp = new Server(
  { name: "plugin:nats", version: "1.0.0" },
  {
    capabilities: { tools: {}, experimental: { "claude/channel": {} } },
    instructions: [
      `You are connected to a NATS agent network as agent ${agentId}.`,
      "",
      "When another agent sends you a direct invocation or broadcast, you receive a channel notification.",
      "Use the tools below to interact with the network:",
      "  publish(subject, payload)                  — fire-and-forget message",
      "  request(subject, payload, timeout_ms?)     — send request and await a single response",
      "  broadcast(capability, payload?, timeout_ms?) — invoke capability on ALL agents, collect responses",
      "  discover(timeout_ms?)                      — ping all agents, return their capabilities",
      "  get_agents()                               — list known agents from local cache",
      "",
      `Your direct invocation subject: claude.agents.${agentId}.invoke.<capability>`,
      "Broadcast subject: claude.agents.broadcast.<capability>",
      "",
      "Agent cache is stored at ~/.claude/channels/nats/agents.json.",
      "Run /nats:configure to change the NATS server URL.",
    ].join("\n"),
  },
);

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "publish",
      description: "Publish a message to a NATS subject (fire and forget).",
      inputSchema: {
        type: "object",
        properties: {
          subject: { type: "string", description: "NATS subject" },
          payload: { type: "object", description: "Message payload" },
        },
        required: ["subject", "payload"],
      },
    },
    {
      name: "request",
      description: "Send a request to a NATS subject and wait for a response.",
      inputSchema: {
        type: "object",
        properties: {
          subject: { type: "string", description: "NATS subject" },
          payload: { type: "object", description: "Request payload" },
          timeout_ms: { type: "number", description: "Timeout in ms (default: 10000)" },
        },
        required: ["subject", "payload"],
      },
    },
    {
      name: "broadcast",
      description: "Invoke a capability on all agents simultaneously and collect their responses.",
      inputSchema: {
        type: "object",
        properties: {
          capability: { type: "string", description: "Capability name to broadcast" },
          payload: { type: "object", description: "Request payload" },
          timeout_ms: { type: "number", description: "Collection window in ms (default: 5000)" },
        },
        required: ["capability"],
      },
    },
    {
      name: "discover",
      description: "Ping all agents on the network and return their capabilities.",
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
    return { content: [{ type: "text", text: "NATS not connected — check /nats:configure" }], isError: true };
  }

  try {
    switch (req.params.name) {
      case "publish": {
        nc!.publish(args.subject as string, sc.encode(envelope(agentId, "request", args.payload ?? {})));
        return { content: [{ type: "text", text: `Published to ${args.subject}` }] };
      }

      case "request": {
        const timeout = (args.timeout_ms as number | undefined) ?? 10_000;
        const resp = await nc!.request(args.subject as string, sc.encode(envelope(agentId, "request", args.payload ?? {})), { timeout });
        return { content: [{ type: "text", text: JSON.stringify(decodeMsg(resp.data, sc), null, 2) }] };
      }

      case "broadcast": {
        const capability = args.capability as string;
        const timeout = (args.timeout_ms as number | undefined) ?? 5_000;
        const inbox = createInbox();
        const responses: Record<string, unknown> = {};
        const sub = nc!.subscribe(inbox);
        const collecting = (async () => {
          for await (const m of sub) {
            const data = decodeMsg(m.data, sc) as any;
            if (data?.from) responses[data.from] = data.payload;
          }
        })();
        nc!.publish(`claude.agents.broadcast.${capability}`, sc.encode(envelope(agentId, "request", args.payload ?? {})), { reply: inbox });
        await new Promise((r) => setTimeout(r, timeout));
        sub.unsubscribe();
        await collecting.catch(() => {});
        return { content: [{ type: "text", text: JSON.stringify(responses, null, 2) }] };
      }

      case "discover": {
        const timeout = (args.timeout_ms as number | undefined) ?? 3_000;
        const agents: Record<string, unknown> = {};
        const sub = nc!.subscribe("claude.discovery.pong");
        const collecting = (async () => {
          for await (const m of sub) {
            const data = decodeMsg(m.data, sc) as any;
            if (data?.from && data.payload) {
              agents[data.from] = { ...data.payload, lastSeen: new Date().toISOString() };
              updateAgentCache(data.from, { agentId: data.from, ...data.payload });
            }
          }
        })();
        nc!.publish("claude.discovery.ping", sc.encode(envelope(agentId, "request", {})));
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
  const caps = getCapabilities();
  const nnc = nc; // narrowed non-null ref for async closures

  // Direct invocation: claude.agents.<id>.invoke.*
  const invokeSub = nnc.subscribe(`claude.agents.${agentId}.invoke.>`);
  (async () => {
    for await (const msg of invokeSub) {
      const capName = msg.subject.split(".").slice(4).join(".");
      const data = decodeMsg(msg.data, sc) as any;
      void mcp.notification({
        method: "notifications/claude/channel",
        params: {
          content: `Invocation request for capability: ${capName}`,
          meta: {
            source: "nats",
            subject: msg.subject,
            capability: capName,
            from: data?.from ?? "unknown",
            ts: new Date().toISOString(),
            ...(msg.reply ? { reply: msg.reply } : {}),
            ...(data?.payload ? { payload: JSON.stringify(data.payload) } : {}),
          },
        },
      });
    }
  })().catch(console.error);

  // Broadcast: claude.agents.broadcast.* (skip self-originated)
  const broadcastSub = nnc.subscribe("claude.agents.broadcast.>");
  (async () => {
    for await (const msg of broadcastSub) {
      const data = decodeMsg(msg.data, sc) as any;
      if (data?.from === agentId) continue;
      const capName = msg.subject.split(".").slice(3).join(".");
      void mcp.notification({
        method: "notifications/claude/channel",
        params: {
          content: `Broadcast request for capability: ${capName}`,
          meta: {
            source: "nats",
            subject: msg.subject,
            capability: capName,
            from: data?.from ?? "unknown",
            ts: new Date().toISOString(),
            ...(msg.reply ? { reply: msg.reply } : {}),
          },
        },
      });
    }
  })().catch(console.error);

  // Discovery ping — respond with our info
  const pingSub = nnc.subscribe("claude.discovery.ping");
  (async () => {
    for await (const _msg of pingSub) {
      nnc.publish("claude.discovery.pong", sc.encode(envelope(agentId, "announce", {
        agentId, name: "Claude Code Agent", capabilities: caps,
      })));
    }
  })().catch(console.error);

  // Discovery pong — update agent cache
  const pongSub = nnc.subscribe("claude.discovery.pong");
  (async () => {
    for await (const msg of pongSub) {
      const data = decodeMsg(msg.data, sc) as any;
      if (data?.from && data.payload && data.from !== agentId) {
        updateAgentCache(data.from, { agentId: data.from, ...data.payload });
      }
    }
  })().catch(console.error);

  // Discovery announce — record joining agents and notify Claude
  const announceSub = nnc.subscribe("claude.discovery.announce");
  (async () => {
    for await (const msg of announceSub) {
      const data = decodeMsg(msg.data, sc) as any;
      if (!data?.from || data.from === agentId) continue;
      updateAgentCache(data.from, { agentId: data.from, ...data.payload });
      void mcp.notification({
        method: "notifications/claude/channel",
        params: {
          content: `Agent joined: ${data.from}`,
          meta: {
            source: "nats",
            event_type: "agent_joined",
            agent_id: data.from,
            ts: new Date().toISOString(),
          },
        },
      });
    }
  })().catch(console.error);

  // Announce self and seed cache
  nnc.publish("claude.discovery.announce", sc.encode(envelope(agentId, "announce", {
    agentId, name: "Claude Code Agent", capabilities: caps,
  })));
  updateAgentCache(agentId, { agentId, name: "Claude Code Agent", capabilities: caps });
  process.stderr.write(`nats: agent ${agentId} ready\n`);

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
