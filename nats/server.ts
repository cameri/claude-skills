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
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
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

/** Returns true for capability names that should never be advertised or executed remotely. */
function isPrivateCapability(name: string): boolean {
  const leaf = name.includes(":") ? name.split(":").pop()! : name;
  return name.startsWith("nats:") || ["configure", "access", "setup"].includes(leaf);
}

/** Parse YAML-like frontmatter between --- delimiters. */
function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([\w-]+):\s*(.+)$/);
    if (m) result[m[1]] = m[2].trim();
  }
  return result;
}

/**
 * Spawn a stdio MCP server, perform the initialize handshake, call tools/list,
 * and return the tools as Capabilities. Kills the process when done or on timeout.
 */
async function queryMcpStdioTools(
  pluginName: string,
  installPath: string,
  command: string,
  args: string[],
): Promise<Capability[]> {
  const expandedArgs = args.map(a => a.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, installPath));
  const TIMEOUT_MS = 15_000;

  const child = spawn(command, expandedArgs, {
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: installPath },
    stdio: ["pipe", "pipe", "ignore"],
  });

  const messages = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "nats-discovery", version: "1.0.0" } } },
    { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
    { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
  ];
  for (const msg of messages) child.stdin.write(JSON.stringify(msg) + "\n");

  const result = await Promise.race([
    new Promise<Capability[]>((resolve) => {
      let buffer = "";
      child.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          try {
            const msg = JSON.parse(line.trim()) as any;
            if (msg.id === 2 && msg.result?.tools) {
              resolve(
                (msg.result.tools as Array<{ name: string; description: string }>)
                  .filter(t => t.name && t.description && !isPrivateCapability(t.name))
                  .map(t => ({ type: "tool" as const, name: t.name, description: t.description })),
              );
            }
          } catch {}
        }
      });
      child.on("close", () => resolve([]));
      child.on("error", () => resolve([]));
    }),
    new Promise<Capability[]>(r => setTimeout(() => r([]), TIMEOUT_MS)),
  ]);

  try { child.kill(); } catch {}
  return result;
}

/**
 * Discover MCP tools from all enabled stdio plugins by spawning each server
 * and calling tools/list. HTTP-type servers and self (nats) are skipped.
 * Falls back gracefully on any per-plugin error.
 */
async function getMcpToolCapabilities(): Promise<Capability[]> {
  const home = homedir();
  const pluginsJsonPath = join(home, ".claude", "plugins", "installed_plugins.json");
  const settingsJsonPath = join(home, ".claude", "settings.json");

  try {
    const settings = JSON.parse(readFileSync(settingsJsonPath, "utf-8")) as { enabledPlugins?: Record<string, boolean> };
    const enabledPlugins = settings.enabledPlugins ?? {};
    const installed = JSON.parse(readFileSync(pluginsJsonPath, "utf-8")) as { plugins?: Record<string, Array<{ installPath: string }>> };

    const queries: Promise<Capability[]>[] = [];

    for (const [pluginKey, entries] of Object.entries(installed.plugins ?? {})) {
      if (!enabledPlugins[pluginKey]) continue;
      const pluginName = pluginKey.split("@")[0];
      if (pluginName === "nats") continue; // skip self

      const installPath = entries[0]?.installPath;
      if (!installPath) continue;

      const mcpJsonPath = join(installPath, ".mcp.json");
      if (!existsSync(mcpJsonPath)) continue;

      let mcpConfig: any;
      try { mcpConfig = JSON.parse(readFileSync(mcpJsonPath, "utf-8")); } catch { continue; }

      for (const serverDef of Object.values(mcpConfig.mcpServers ?? {})) {
        const def = serverDef as any;
        if (!def.command || def.type === "http") continue;
        queries.push(
          queryMcpStdioTools(pluginName, installPath, def.command, def.args ?? [])
            .then(tools => {
              if (tools.length) process.stderr.write(`nats: discovered ${tools.length} MCP tools from ${pluginName}\n`);
              return tools;
            })
            .catch(e => {
              process.stderr.write(`nats: MCP tool discovery for ${pluginName} failed — ${(e as Error).message}\n`);
              return [];
            }),
        );
      }
    }

    const results = await Promise.allSettled(queries);
    return results.flatMap(r => r.status === "fulfilled" ? r.value : []);
  } catch (e) {
    process.stderr.write(`nats: getMcpToolCapabilities error — ${(e as Error).message}\n`);
    return [];
  }
}

/**
 * Dynamically build the capability list by scanning all installed plugins.
 * Reads ~/.claude/plugins/installed_plugins.json, then for each enabled plugin
 * scans its skills/ (SKILL.md) and agents/ (*.md) directories.
 */
function getCapabilities(): Capability[] {
  const caps: Capability[] = [];
  const home = homedir();
  const pluginsJsonPath = join(home, ".claude", "plugins", "installed_plugins.json");
  const settingsJsonPath = join(home, ".claude", "settings.json");

  try {
    const settings = JSON.parse(readFileSync(settingsJsonPath, "utf-8")) as {
      enabledPlugins?: Record<string, boolean>;
    };
    const enabledPlugins = settings.enabledPlugins ?? {};
    const installed = JSON.parse(readFileSync(pluginsJsonPath, "utf-8")) as {
      plugins?: Record<string, Array<{ installPath: string }>>;
    };

    for (const [pluginKey, entries] of Object.entries(installed.plugins ?? {})) {
      if (!enabledPlugins[pluginKey]) continue;
      const pluginName = pluginKey.split("@")[0];
      const installPath = entries[0]?.installPath;
      if (!installPath) continue;

      // Skills: installPath/skills/<skill-dir>/SKILL.md
      const skillsDir = join(installPath, "skills");
      if (existsSync(skillsDir)) {
        for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          const mdPath = join(skillsDir, entry.name, "SKILL.md");
          if (!existsSync(mdPath)) continue;
          const fm = parseFrontmatter(readFileSync(mdPath, "utf-8"));
          if (!fm.name || !fm.description) continue;
          const capName = `${pluginName}:${fm.name}`;
          if (isPrivateCapability(capName)) continue;
          caps.push({ type: "skill", name: capName, description: fm.description });
        }
      }

      // Agents: installPath/agents/<name>.md
      const agentsDir = join(installPath, "agents");
      if (existsSync(agentsDir)) {
        for (const entry of readdirSync(agentsDir, { withFileTypes: true })) {
          if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
          const mdPath = join(agentsDir, entry.name);
          const fm = parseFrontmatter(readFileSync(mdPath, "utf-8"));
          if (!fm.name || !fm.description) continue;
          if (isPrivateCapability(fm.name)) continue;
          caps.push({ type: "skill", name: fm.name, description: fm.description });
        }
      }
    }
  } catch (e) {
    process.stderr.write(`nats: getCapabilities error — ${(e as Error).message}\n`);
  }

  return caps;
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
          reply: { type: "string", description: "Optional reply subject — recipient will send responses here" },
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
        const pubOpts = args.reply ? { reply: args.reply as string } : undefined;
        nc!.publish(args.subject as string, sc.encode(envelope(agentId, "request", args.payload ?? {})), pubOpts);
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
  const caps = [...getCapabilities(), ...await getMcpToolCapabilities()];
  const nnc = nc; // narrowed non-null ref for async closures

  // Direct invocation: claude.agents.<id>.invoke.*
  const invokeSub = nnc.subscribe(`claude.agents.${agentId}.invoke.>`);
  (async () => {
    for await (const msg of invokeSub) {
      const capName = msg.subject.split(".").slice(4).join(".");
      if (isPrivateCapability(capName)) continue;
      const data = decodeMsg(msg.data, sc) as any;
      if (msg.reply) {
        nnc.publish(msg.reply, sc.encode(envelope(agentId, "ack", { status: "accepted", capability: capName })));
      }
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
      if (isPrivateCapability(capName)) continue;
      if (msg.reply) {
        nnc.publish(msg.reply, sc.encode(envelope(agentId, "ack", { status: "accepted", capability: capName })));
      }
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

  // Direct message: claude.agents.<id>.message (free-form agent-to-agent)
  const messageSub = nnc.subscribe(`claude.agents.${agentId}.message`);
  (async () => {
    for await (const msg of messageSub) {
      const data = decodeMsg(msg.data, sc) as any;
      if (data?.from === agentId) continue;
      if (msg.reply) {
        nnc.publish(msg.reply, sc.encode(envelope(agentId, "ack", { status: "accepted" })));
      }
      void mcp.notification({
        method: "notifications/claude/channel",
        params: {
          content: data?.payload?.text ?? "Message from agent",
          meta: {
            source: "nats",
            event_type: "agent_message",
            subject: msg.subject,
            from: data?.from ?? "unknown",
            ts: new Date().toISOString(),
            ...(msg.reply ? { reply: msg.reply } : {}),
            ...(data?.payload ? { payload: JSON.stringify(data.payload) } : {}),
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
