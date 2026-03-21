#!/usr/bin/env bun
/**
 * Claude Code NATS Agent Server
 *
 * Registers this Claude instance as a discoverable NATS service.
 * Reads NATS_URL from env (default: nats://nats:4222, fallback: nats://nats-server:4222).
 *
 * Subject hierarchy:
 *   claude.agents.<agent-id>.capabilities   — query this agent's capabilities
 *   claude.agents.<agent-id>.invoke.<cap>   — invoke a capability
 *   claude.agents.broadcast.<cap>           — broadcast capability call to all agents
 *   claude.discovery.announce               — agent announces itself on join
 *   claude.discovery.ping                   — discovery ping (all agents reply on pong)
 *   claude.discovery.pong                   — discovery pong responses
 *
 * Message envelope:
 *   { schema: "1.0", from: "<agent-id>", ts: "<ISO>", type: "request|response|announce|error", payload: {...} }
 */

import { connect, StringCodec } from "nats";
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { randomUUID } from "crypto";
import { homedir } from "os";
import { join } from "path";

const PRIMARY_URL = process.env.NATS_URL || "nats://nats:4222";
const FALLBACK_URL = "nats://nats-server:4222";
const SKILL_DIR = join(homedir(), ".claude", "skills", "nats");
const AGENT_ID_FILE = join(SKILL_DIR, "agent-id");
const PID_FILE = "/tmp/nats-agent.pid";
const AGENTS_CACHE = "/tmp/nats-agents.json";

// ── Agent ID ──────────────────────────────────────────────────────────────────

function getAgentId(): string {
  if (existsSync(AGENT_ID_FILE)) {
    return readFileSync(AGENT_ID_FILE, "utf-8").trim();
  }
  mkdirSync(SKILL_DIR, { recursive: true });
  const id = `claude-${randomUUID().slice(0, 8)}`;
  writeFileSync(AGENT_ID_FILE, id);
  return id;
}

// ── Agent cache ───────────────────────────────────────────────────────────────

interface AgentInfo {
  agentId: string;
  name: string;
  capabilities: Capability[];
  lastSeen: string;
}

interface Capability {
  type: "tool" | "skill" | "command";
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

function loadCache(): Record<string, AgentInfo> {
  try {
    return JSON.parse(readFileSync(AGENTS_CACHE, "utf-8"));
  } catch {
    return {};
  }
}

function updateAgentCache(agentId: string, info: Partial<AgentInfo>) {
  const cache = loadCache();
  cache[agentId] = { ...(cache[agentId] ?? {}), ...info, lastSeen: new Date().toISOString() } as AgentInfo;
  writeFileSync(AGENTS_CACHE, JSON.stringify(cache, null, 2));
}

// ── Message envelope ──────────────────────────────────────────────────────────

type MsgType = "request" | "response" | "announce" | "error";

function envelope(from: string, type: MsgType, payload: unknown): string {
  return JSON.stringify({ schema: "1.0", from, ts: new Date().toISOString(), type, payload });
}

function decodeEnvelope(raw: Uint8Array, sc: ReturnType<typeof StringCodec>) {
  try {
    return JSON.parse(sc.decode(raw));
  } catch {
    return null;
  }
}

// ── Capabilities ──────────────────────────────────────────────────────────────

function getCapabilities(): Capability[] {
  return [
    { type: "skill", name: "nats:configure", description: "Configure the NATS server URL" },
    { type: "skill", name: "nats:start", description: "Start the NATS agent server" },
    { type: "skill", name: "nats:stop", description: "Stop the NATS agent server" },
    { type: "skill", name: "nats:status", description: "Show NATS agent status and known agents" },
    { type: "skill", name: "nats:discover", description: "Discover all NATS agents and their capabilities" },
    { type: "skill", name: "nats:call", description: "Invoke a capability on a specific agent" },
    { type: "skill", name: "nats:broadcast", description: "Broadcast a capability call to all agents" },
  ];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const agentId = getAgentId();
  const sc = StringCodec();

  // Connect — try primary URL first, then fallback
  let nc;
  const urls = PRIMARY_URL === FALLBACK_URL ? [PRIMARY_URL] : [PRIMARY_URL, FALLBACK_URL];
  let lastError: unknown;
  for (const url of urls) {
    try {
      nc = await connect({ servers: url });
      console.log(`Connected to NATS at ${url}`);
      break;
    } catch (e) {
      console.warn(`Could not connect to ${url}: ${(e as Error).message}`);
      lastError = e;
    }
  }
  if (!nc) {
    console.error("Failed to connect to any NATS server:", lastError);
    process.exit(1);
  }

  // Write PID
  writeFileSync(PID_FILE, process.pid.toString());

  const caps = getCapabilities();

  // ── NATS Service (built-in services framework) ─────────────────────────────

  const svc = await nc.services.add({
    name: "claude-agent",
    version: "1.0.0",
    description: `Claude Code Agent (${agentId})`,
    metadata: { agentId },
  });

  // Service endpoint: capabilities
  const capEndpoint = svc.addEndpoint("capabilities");
  (async () => {
    for await (const msg of capEndpoint) {
      msg.respond(sc.encode(envelope(agentId, "response", {
        success: true,
        result: { agentId, name: "Claude Code Agent", capabilities: caps },
        error: null,
      })));
    }
  })().catch(console.error);

  // Service endpoint: invoke
  const invokeEndpoint = svc.addEndpoint("invoke");
  (async () => {
    for await (const msg of invokeEndpoint) {
      let result: unknown = null;
      let error: string | null = null;
      try {
        const data = decodeEnvelope(msg.data, sc);
        const capName = data?.payload?.capability as string | undefined;
        if (!capName) {
          error = "Missing payload.capability";
        } else {
          // Capability dispatch — extend here to wire in real handlers
          result = { message: `Received invoke for '${capName}' — handler not yet registered` };
        }
      } catch (e) {
        error = (e as Error).message;
      }
      msg.respond(sc.encode(envelope(agentId, "response", { success: !error, result, error })));
    }
  })().catch(console.error);

  // ── Custom subject subscriptions ───────────────────────────────────────────

  // Direct capabilities query
  const directCapSub = nc.subscribe(`claude.agents.${agentId}.capabilities`);
  (async () => {
    for await (const msg of directCapSub) {
      msg.respond(sc.encode(envelope(agentId, "response", {
        success: true,
        result: { agentId, name: "Claude Code Agent", capabilities: caps },
        error: null,
      })));
    }
  })().catch(console.error);

  // Direct invoke: claude.agents.<id>.invoke.<cap>
  const directInvokeSub = nc.subscribe(`claude.agents.${agentId}.invoke.>`);
  (async () => {
    for await (const msg of directInvokeSub) {
      const capName = msg.subject.split(".").slice(4).join(".");
      msg.respond?.(sc.encode(envelope(agentId, "response", {
        success: true,
        result: { message: `Received invoke for '${capName}' — handler not yet registered` },
        error: null,
      })));
    }
  })().catch(console.error);

  // Discovery ping — reply on pong and update cache
  const pingSub = nc.subscribe("claude.discovery.ping");
  (async () => {
    for await (const msg of pingSub) {
      const pong = envelope(agentId, "announce", {
        agentId, name: "Claude Code Agent", capabilities: caps,
      });
      nc.publish("claude.discovery.pong", sc.encode(pong));
      updateAgentCache(agentId, { agentId, name: "Claude Code Agent", capabilities: caps });
    }
  })().catch(console.error);

  // Discovery pong — record other agents
  const pongSub = nc.subscribe("claude.discovery.pong");
  (async () => {
    for await (const msg of pongSub) {
      const data = decodeEnvelope(msg.data, sc);
      if (data?.from && data.payload) {
        updateAgentCache(data.from, { agentId: data.from, ...data.payload });
      }
    }
  })().catch(console.error);

  // Discovery announce — record new agents joining
  const announceSub = nc.subscribe("claude.discovery.announce");
  (async () => {
    for await (const msg of announceSub) {
      const data = decodeEnvelope(msg.data, sc);
      if (data?.from && data.payload) {
        updateAgentCache(data.from, { agentId: data.from, ...data.payload });
        if (data.from !== agentId) {
          console.log(`Agent joined: ${data.from}`);
        }
      }
    }
  })().catch(console.error);

  // Broadcast: claude.agents.broadcast.<cap>
  const broadcastSub = nc.subscribe("claude.agents.broadcast.>");
  (async () => {
    for await (const msg of broadcastSub) {
      const capName = msg.subject.split(".").slice(3).join(".");
      console.log(`Broadcast received for capability: ${capName}`);
      if (msg.reply) {
        msg.respond(sc.encode(envelope(agentId, "response", {
          success: true,
          result: { message: `Agent ${agentId} received broadcast for '${capName}'` },
          error: null,
        })));
      }
    }
  })().catch(console.error);

  // ── Announce self ──────────────────────────────────────────────────────────

  nc.publish("claude.discovery.announce", sc.encode(envelope(agentId, "announce", {
    agentId, name: "Claude Code Agent", capabilities: caps,
  })));
  updateAgentCache(agentId, { agentId, name: "Claude Code Agent", capabilities: caps });
  console.log(`Agent ${agentId} ready.`);

  // ── Graceful shutdown ──────────────────────────────────────────────────────

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down...`);
    try { await svc.stop(); } catch { /* ignore */ }
    try { await nc.drain(); } catch { /* ignore */ }
    try { unlinkSync(PID_FILE); } catch { /* ignore */ }
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Keep alive
  await nc.closed().then(() => {
    console.log("NATS connection closed.");
    try { unlinkSync(PID_FILE); } catch { /* ignore */ }
  });
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
