#!/usr/bin/env bun
/**
 * Claude Code Webhooks Channel Server
 *
 * MCP server that runs an Express HTTP listener and a BullMQ worker.
 * External systems POST to /webhook/{id} — the server responds 202 immediately
 * and enqueues a job. The worker dequeues it and sends a channel notification
 * to Claude so it can react to the event.
 *
 * State: ~/.claude/channels/webhooks/
 *   webhooks.json  — webhook configurations
 *   config.json    — server config (port, redis URL, trust proxy)
 */

import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import express from "express";
import { Queue, Worker } from "bullmq";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// ── State ─────────────────────────────────────────────────────────────────────

const STATE_DIR = join(homedir(), ".claude", "channels", "webhooks");
const WEBHOOKS_FILE = join(STATE_DIR, "webhooks.json");
const CONFIG_FILE = join(STATE_DIR, "config.json");

mkdirSync(STATE_DIR, { recursive: true });

// ── Types ─────────────────────────────────────────────────────────────────────

interface WebhookAuth {
  mode: "none" | "hmac_sha256" | "header";
  /** HMAC secret or direct header value */
  secret?: string;
  /** Header name: X-Signature-256 (hmac) or X-Webhook-Secret (header) */
  header?: string;
  /** For hmac_sha256: whether signature has "sha256=" prefix. Default: true */
  hmacPrefix?: boolean;
}

interface WebhookConfig {
  id: string;
  name: string;
  enabled: boolean;
  /** Empty = allow all source IPs */
  allowedIps: string[];
  auth: WebhookAuth;
  created: string;
}

interface PluginConfig {
  port: number;
  redisUrl: string;
  /** Trust X-Forwarded-For for client IP resolution */
  trustProxy: boolean;
}

interface WebhookJob {
  webhookId: string;
  webhookName: string;
  payload: unknown;
  contentType: string;
  method: string;
  receivedAt: string;
  sourceIp: string;
}

// ── Config helpers ────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: PluginConfig = {
  port: 3456,
  redisUrl: "redis://localhost:6379",
  trustProxy: false,
};

function loadConfig(): PluginConfig {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(cfg: PluginConfig): void {
  writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

// ── Webhook helpers ───────────────────────────────────────────────────────────

function loadWebhooks(): WebhookConfig[] {
  try {
    return JSON.parse(readFileSync(WEBHOOKS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveWebhooks(webhooks: WebhookConfig[]): void {
  writeFileSync(WEBHOOKS_FILE, JSON.stringify(webhooks, null, 2));
}

function redactWebhook(w: WebhookConfig): object {
  return { ...w, auth: { ...w.auth, secret: w.auth.secret ? "***" : undefined } };
}

// ── Security helpers ──────────────────────────────────────────────────────────

function getClientIp(req: express.Request, trustProxy: boolean): string {
  if (trustProxy) {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) {
      const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return raw.split(",")[0].trim();
    }
  }
  return req.socket.remoteAddress ?? "unknown";
}

function verifyHmac(
  rawBody: Buffer,
  secret: string,
  signature: string,
  withPrefix: boolean,
): boolean {
  const hex = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expected = withPrefix ? `sha256=${hex}` : hex;
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ── MCP Server ────────────────────────────────────────────────────────────────

// Declared here so the BullMQ worker can reference it after connect().
let mcp: Server;

mcp = new Server(
  { name: "plugin:webhooks", version: "0.1.0" },
  {
    capabilities: { tools: {}, experimental: { "claude/channel": {} } },
    instructions: [
      "You receive webhook events from external systems as channel notifications.",
      "Notifications arrive with source=\"webhooks\" and include the webhook ID, name, method, source IP, content type, and payload.",
      "",
      "Tools: add_webhook, list_webhooks, update_webhook, remove_webhook, get_config, set_config",
      "",
      "Auth modes:",
      "  none        — accept any request",
      "  hmac_sha256 — verify HMAC-SHA256 signature header (e.g. X-Signature-256: sha256=<hex>)",
      "  header      — require exact match of a secret in a header (e.g. X-Webhook-Secret)",
      "",
      "Run get_config to see the current port and Redis URL.",
      "Changes to config take effect on next server restart.",
    ].join("\n"),
  },
);

// ── Tool definitions ──────────────────────────────────────────────────────────

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "add_webhook",
      description: "Create a new webhook endpoint. Returns the URL path to configure in the external service.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Friendly name for this webhook (e.g. 'GitHub Push')" },
          allowed_ips: {
            type: "array",
            items: { type: "string" },
            description: "IP addresses allowed to send requests. Empty = allow all.",
          },
          auth_mode: {
            type: "string",
            enum: ["none", "hmac_sha256", "header"],
            description: "Security mode. 'none' = open, 'hmac_sha256' = HMAC-SHA256 signature, 'header' = direct secret header.",
          },
          secret: {
            type: "string",
            description: "HMAC signing secret or direct header value. Required for hmac_sha256 and header modes.",
          },
          auth_header: {
            type: "string",
            description: "Header name to check. Default: X-Signature-256 (hmac_sha256) or X-Webhook-Secret (header).",
          },
          hmac_prefix: {
            type: "boolean",
            description: "For hmac_sha256: expect 'sha256=' prefix in signature value (default: true, matches GitHub format).",
          },
        },
        required: ["name", "auth_mode"],
      },
    },
    {
      name: "list_webhooks",
      description: "List all configured webhook endpoints. Secrets are redacted.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "update_webhook",
      description: "Update an existing webhook configuration. Only specified fields are changed.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Webhook ID to update" },
          name: { type: "string" },
          enabled: { type: "boolean", description: "Enable or disable this webhook without deleting it" },
          allowed_ips: { type: "array", items: { type: "string" } },
          auth_mode: { type: "string", enum: ["none", "hmac_sha256", "header"] },
          secret: { type: "string" },
          auth_header: { type: "string" },
          hmac_prefix: { type: "boolean" },
        },
        required: ["id"],
      },
    },
    {
      name: "remove_webhook",
      description: "Permanently remove a webhook endpoint.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Webhook ID to remove" },
        },
        required: ["id"],
      },
    },
    {
      name: "get_config",
      description: "Show current server configuration: port, Redis URL, trust proxy setting.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "set_config",
      description: "Update server configuration. Restart the server for changes to take effect.",
      inputSchema: {
        type: "object",
        properties: {
          port: { type: "number", description: "HTTP port (default: 3456)" },
          redis_url: { type: "string", description: "Redis connection URL (default: redis://localhost:6379)" },
          trust_proxy: {
            type: "boolean",
            description: "Trust X-Forwarded-For header for real client IP when behind a reverse proxy (default: false)",
          },
        },
      },
    },
  ],
}));

// ── Tool handlers ─────────────────────────────────────────────────────────────

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = (req.params.arguments ?? {}) as Record<string, unknown>;

  switch (req.params.name) {
    case "add_webhook": {
      const authMode = (args.auth_mode as string) ?? "none";
      if ((authMode === "hmac_sha256" || authMode === "header") && !args.secret) {
        return {
          content: [{ type: "text", text: `"secret" is required for auth_mode "${authMode}".` }],
          isError: true,
        };
      }
      const id = randomUUID().slice(0, 8);
      const defaultHeader =
        authMode === "hmac_sha256" ? "X-Signature-256" :
        authMode === "header"      ? "X-Webhook-Secret" :
        undefined;
      const webhook: WebhookConfig = {
        id,
        name: args.name as string,
        enabled: true,
        allowedIps: (args.allowed_ips as string[] | undefined) ?? [],
        auth: {
          mode: authMode as WebhookAuth["mode"],
          secret: args.secret as string | undefined,
          header: (args.auth_header as string | undefined) ?? defaultHeader,
          hmacPrefix: (args.hmac_prefix as boolean | undefined) ?? true,
        },
        created: new Date().toISOString(),
      };
      const webhooks = loadWebhooks();
      webhooks.push(webhook);
      saveWebhooks(webhooks);
      const cfg = loadConfig();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            id,
            name: webhook.name,
            url_path: `/webhook/${id}`,
            port: cfg.port,
            full_url: `http://<your-host>:${cfg.port}/webhook/${id}`,
            auth_mode: webhook.auth.mode,
            auth_header: webhook.auth.header,
            created: webhook.created,
          }, null, 2),
        }],
      };
    }

    case "list_webhooks": {
      const webhooks = loadWebhooks();
      if (webhooks.length === 0) {
        return { content: [{ type: "text", text: "No webhooks configured." }] };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(webhooks.map(redactWebhook), null, 2) }],
      };
    }

    case "update_webhook": {
      const webhooks = loadWebhooks();
      const idx = webhooks.findIndex(w => w.id === args.id);
      if (idx === -1) {
        return { content: [{ type: "text", text: `Webhook "${args.id}" not found.` }], isError: true };
      }
      const w = webhooks[idx];
      if (args.name      !== undefined) w.name              = args.name      as string;
      if (args.enabled   !== undefined) w.enabled           = args.enabled   as boolean;
      if (args.allowed_ips !== undefined) w.allowedIps      = args.allowed_ips as string[];
      if (args.auth_mode !== undefined) w.auth.mode         = args.auth_mode  as WebhookAuth["mode"];
      if (args.secret    !== undefined) w.auth.secret       = args.secret    as string;
      if (args.auth_header !== undefined) w.auth.header     = args.auth_header as string;
      if (args.hmac_prefix !== undefined) w.auth.hmacPrefix = args.hmac_prefix as boolean;
      saveWebhooks(webhooks);
      return { content: [{ type: "text", text: JSON.stringify(redactWebhook(w), null, 2) }] };
    }

    case "remove_webhook": {
      const before = loadWebhooks();
      const after = before.filter(w => w.id !== args.id);
      if (before.length === after.length) {
        return { content: [{ type: "text", text: `Webhook "${args.id}" not found.` }], isError: true };
      }
      saveWebhooks(after);
      return { content: [{ type: "text", text: `Webhook "${args.id}" removed.` }] };
    }

    case "get_config": {
      return { content: [{ type: "text", text: JSON.stringify(loadConfig(), null, 2) }] };
    }

    case "set_config": {
      const cfg = loadConfig();
      if (args.port        !== undefined) cfg.port        = args.port        as number;
      if (args.redis_url   !== undefined) cfg.redisUrl    = args.redis_url   as string;
      if (args.trust_proxy !== undefined) cfg.trustProxy  = args.trust_proxy as boolean;
      saveConfig(cfg);
      return {
        content: [{
          type: "text",
          text: `Config saved. Restart the server for changes to take effect.\n${JSON.stringify(cfg, null, 2)}`,
        }],
      };
    }

    default:
      return { content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }], isError: true };
  }
});

// ── Connect MCP (must happen before BullMQ worker starts) ─────────────────────

await mcp.connect(new StdioServerTransport());

// ── BullMQ setup ──────────────────────────────────────────────────────────────

const config = loadConfig();
const redisConnection = { url: config.redisUrl };

const queue = new Queue<WebhookJob>("webhooks", { connection: redisConnection });

const worker = new Worker<WebhookJob>(
  "webhooks",
  async (job) => {
    const { webhookId, webhookName, payload, contentType, method, receivedAt, sourceIp } = job.data;

    const payloadStr =
      typeof payload === "string"
        ? payload
        : JSON.stringify(payload, null, 2);

    const content = [
      `Webhook received: ${webhookName} (${webhookId})`,
      `Method: ${method}`,
      `Source IP: ${sourceIp}`,
      `Content-Type: ${contentType}`,
      `Received at: ${receivedAt}`,
      ``,
      `Payload:`,
      payloadStr,
    ].join("\n");

    await mcp.notification({
      method: "notifications/claude/channel",
      params: {
        content,
        meta: {
          source: "webhooks",
          webhook_id: webhookId,
          webhook_name: webhookName,
          method,
          content_type: contentType,
          source_ip: sourceIp,
          received_at: receivedAt,
        },
      },
    });
  },
  { connection: redisConnection },
);

worker.on("failed", (job, err) => {
  process.stderr.write(`webhooks: job ${job?.id} failed: ${err.message}\n`);
});

// ── Express server ────────────────────────────────────────────────────────────

const app = express();

// Capture raw body for HMAC verification — must come before any json parser.
app.use(express.raw({ type: "*/*", limit: "1mb" }));

app.post("/webhook/:id", async (req, res) => {
  const webhookId = req.params.id;
  const webhooks = loadWebhooks();
  const webhook = webhooks.find(w => w.id === webhookId);

  // Return 404 for both missing and disabled to avoid enumeration.
  if (!webhook || !webhook.enabled) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  // ── IP allowlist ──────────────────────────────────────────────────────────
  const clientIp = getClientIp(req, config.trustProxy);
  if (webhook.allowedIps.length > 0 && !webhook.allowedIps.includes(clientIp)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // ── Signature / auth ──────────────────────────────────────────────────────
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

  if (webhook.auth.mode === "hmac_sha256") {
    const sigHeader = webhook.auth.header ?? "X-Signature-256";
    const signature = req.headers[sigHeader.toLowerCase()] as string | undefined;
    if (!signature) {
      res.status(401).json({ error: "Missing signature header" });
      return;
    }
    if (!verifyHmac(rawBody, webhook.auth.secret!, signature, webhook.auth.hmacPrefix ?? true)) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }
  } else if (webhook.auth.mode === "header") {
    const secretHeader = webhook.auth.header ?? "X-Webhook-Secret";
    const value = req.headers[secretHeader.toLowerCase()] as string | undefined;
    if (!value || value !== webhook.auth.secret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  // ── Parse payload ─────────────────────────────────────────────────────────
  const contentType = req.headers["content-type"] ?? "application/octet-stream";
  let payload: unknown;
  if (contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawBody.toString("utf-8"));
    } catch {
      payload = rawBody.toString("utf-8");
    }
  } else {
    payload = rawBody.toString("utf-8");
  }

  // ── Enqueue — respond 202 immediately ─────────────────────────────────────
  await queue.add("webhook", {
    webhookId: webhook.id,
    webhookName: webhook.name,
    payload,
    contentType,
    method: req.method,
    receivedAt: new Date().toISOString(),
    sourceIp: clientIp,
  });

  res.status(202).json({ status: "accepted" });
});

app.listen(config.port, () => {
  process.stderr.write(`webhooks: Express listening on port ${config.port}\n`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────

const shutdown = async () => {
  await worker.close();
  await queue.close();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
