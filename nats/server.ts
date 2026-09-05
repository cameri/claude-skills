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
import { join } from "node:path";
import { resolveClaudeBaseDir } from "./paths.ts";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// ── Config ────────────────────────────────────────────────────────────────────

const CLAUDE_BASE = resolveClaudeBaseDir();
const STATE_DIR = join(CLAUDE_BASE, "channels", "nats");
const ENV_FILE = join(STATE_DIR, ".env");
const SKILL_DIR = join(CLAUDE_BASE, "skills", "nats");
const AGENT_ID_FILE = join(SKILL_DIR, "agent-id");
const AGENTS_CACHE = join(STATE_DIR, "agents.json");
const SESSIONS_DIR = join(CLAUDE_BASE, "sessions");

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

/**
 * Reads the persisted agent ID, or generates and persists a new one. The
 * generate-and-write path is racy across concurrent first-boot processes
 * (Claude Code can spawn more than one instance of a channel's MCP server
 * while it's still starting up, e.g. during a slow first `bun install`) —
 * an exclusive create makes concurrent racers converge on one winner's ID
 * instead of each keeping its own, which otherwise leaves the network with
 * several live identities all claiming to be "this agent".
 */
function getAgentId(): string {
  if (existsSync(AGENT_ID_FILE)) return readFileSync(AGENT_ID_FILE, "utf-8").trim();
  mkdirSync(SKILL_DIR, { recursive: true });
  const id = `claude-${randomUUID().slice(0, 8)}`;
  try {
    writeFileSync(AGENT_ID_FILE, id, { flag: "wx" });
    return id;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") return readFileSync(AGENT_ID_FILE, "utf-8").trim();
    throw e;
  }
}

const agentId = getAgentId();

/**
 * Reads the PPid field out of /proc/<pid>/status. Returns undefined at the
 * top of the tree or if /proc isn't available (non-Linux).
 */
function getParentPid(pid: number): number | undefined {
  try {
    const status = readFileSync(`/proc/${pid}/status`, "utf-8");
    const m = status.match(/^PPid:\s*(\d+)/m);
    return m ? Number(m[1]) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Claude Code's channel MCP servers run under an intermediate wrapper (e.g.
 * `bun run --cwd <plugin> start`), so the real `claude` process is a
 * grandparent, not the immediate parent — process.ppid alone doesn't reach
 * its session file. Walk up the process tree looking for a
 * ~/.claude/sessions/<pid>.json, capped well above any plausible wrapper
 * depth.
 */
function findAncestorSessionName(): string | undefined {
  let pid: number | undefined = process.ppid;
  for (let hops = 0; pid && pid > 1 && hops < 8; hops++) {
    try {
      const session = JSON.parse(readFileSync(join(SESSIONS_DIR, `${pid}.json`), "utf-8")) as { name?: string };
      if (session.name) return session.name;
    } catch {}
    pid = getParentPid(pid);
  }
  return undefined;
}

/**
 * Friendly display name, resolved fresh on every use (not cached at startup)
 * so a `/rename` picked up mid-session shows up on the next message without
 * restarting the channel server. Precedence: explicit NATS_AGENT_NAME env
 * override, then this Claude Code session's own display name (set via
 * `/rename`, found by walking up to the ancestor `claude` process's session
 * file), then the bare agent ID.
 */
function getAgentName(): string {
  if (process.env.NATS_AGENT_NAME) return process.env.NATS_AGENT_NAME;
  return findAncestorSessionName() ?? agentId;
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

// ── Graceful shutdown ─────────────────────────────────────────────────────────
// Registered immediately after the transport connects, before any NATS setup
// that might take a while — StdioServerTransport only listens for
// 'data'/'error' on stdin, never 'end'/'close', so if Claude Code
// disconnects a channel server by closing its stdin pipe rather than
// sending SIGTERM (observed live: /reload-plugins leaves the old nats
// process running indefinitely, still connected to NATS and responding to
// discover/ping under a stale identity), neither the SDK nor a
// late-registered listener here would notice — Node doesn't replay a
// missed 'end' event to a listener added after it already fired.

const shutdown = async () => {
  try { await nc?.drain(); } catch {}
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.stdin.on("end", shutdown);
process.stdin.on("close", shutdown);

// ── NATS connection ───────────────────────────────────────────────────────────

// Connect with an infinite reconnect budget so a NATS outage or server restart
// is recovered in place: nats.js retries a live connection (and resubscribes
// its listeners) on its own, while connectNatsUntilConnected() below keeps
// re-attempting an initial connect that failed because the server was down at
// boot. Without the retry the channel server would sit permanently
// "not connected" (its MCP host respawns it only on crash, not on a dropped
// connection), silently dropping inbound messages until a manual restart.
async function connectNats(): Promise<NatsConnection> {
  const urls = PRIMARY_URL === FALLBACK_URL ? [PRIMARY_URL] : [PRIMARY_URL, FALLBACK_URL];
  let lastErr: unknown;
  for (const url of urls) {
    try {
      const conn = await connect({
        servers: url,
        maxReconnectAttempts: -1, // never give up on an established connection
        reconnectTimeWait: 2_000,
      });
      process.stderr.write(`nats: connected to ${url}\n`);
      return conn;
    } catch (e) {
      process.stderr.write(`nats: could not connect to ${url}: ${(e as Error).message}\n`);
      lastErr = e;
    }
  }
  throw lastErr;
}

/** Retry the initial connect forever (exponential backoff) until the server is reachable. */
async function connectNatsUntilConnected(): Promise<NatsConnection> {
  let delay = 1_000;
  for (;;) {
    try {
      return await connectNats();
    } catch (e) {
      process.stderr.write(`nats: not connected (${(e as Error).message}); retrying in ${Math.round(delay / 1000)}s\n`);
    }
    const { promise, resolve } = Promise.withResolvers<void>();
    setTimeout(resolve, delay);
    await promise;
    delay = Math.min(delay * 2, 30_000);
  }
}

/**
 * Wire inbox/ping/discovery listeners and announce self on a live connection.
 * Runs once per NatsConnection; nats.js resubscribes these listeners
 * automatically across the internal reconnects of that same connection.
 */
function wireListeners(conn: NatsConnection): void {
  // Inbox: claude.agents.<id>.inbox — free-form message from another agent
  const inboxSub = conn.subscribe(`claude.agents.${agentId}.inbox`);
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
  const pingSub = conn.subscribe(`claude.agents.${agentId}.ping`);
  (async () => {
    for await (const msg of pingSub) {
      if (msg.reply) conn.publish(msg.reply, sc.encode(envelope("pong", {})));
    }
  })().catch(console.error);

  // Discovery ping — respond with our identity
  const discoveryPingSub = conn.subscribe("claude.discovery.ping");
  (async () => {
    for await (const _msg of discoveryPingSub) {
      conn.publish("claude.discovery.pong", sc.encode(envelope("pong", {})));
    }
  })().catch(console.error);

  // Discovery pong — passively update agent cache even outside an active discover() call
  const pongSub = conn.subscribe("claude.discovery.pong");
  (async () => {
    for await (const msg of pongSub) {
      const data = decodeMsg(msg.data, sc) as any;
      if (data?.from && data.from !== agentId) {
        updateAgentCache(data.from, { agentId: data.from, name: data.fromName });
      }
    }
  })().catch(console.error);

  // Discovery announce — record joining agents and notify Claude
  const announceSub = conn.subscribe("claude.discovery.announce");
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

  // Announce self, seed the cache, and re-announce whenever nats.js completes
  // an internal reconnect so peers refresh our lastSeen after a blip.
  conn.publish("claude.discovery.announce", sc.encode(envelope("announce", {})));
  updateAgentCache(agentId, { agentId, name: getAgentName() });
  process.stderr.write(`nats: agent ${agentId} ("${getAgentName()}") ready\n`);
  (async () => {
    for await (const status of conn.status()) {
      if (status.type === "reconnect") {
        process.stderr.write("nats: reconnected; re-announcing\n");
        conn.publish("claude.discovery.announce", sc.encode(envelope("announce", {})));
        updateAgentCache(agentId, { agentId, name: getAgentName() });
      }
    }
  })().catch(() => {});
}

/**
 * Drive the NATS connection for the life of the process: connect (retrying
 * until the server is reachable), wire listeners, then block until that
 * connection permanently ends and re-establish from scratch.
 */
async function runNats(): Promise<void> {
  for (;;) {
    const conn = await connectNatsUntilConnected();
    nc = conn;
    wireListeners(conn);
    await conn.closed().catch(() => {});
    process.stderr.write("nats: connection closed; reconnecting\n");
    if (nc === conn) nc = null;
  }
}

void runNats();
