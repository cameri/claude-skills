#!/usr/bin/env bun
/**
 * SearXNG-backed web tools for the replicator's quarantine agent.
 *
 * The quarantine agent (agents/quarantine.md) is deliberately fetch-only —
 * no Bash/Write/Edit/Agent, so nothing it reads can persist, execute, or
 * delegate. Under omp, subagent sessions only receive mounted MCP server
 * tools (the harness's WebSearch/WebFetch are not propagated to agents),
 * so this plugin exposes two tools that agent sessions inherit:
 *
 *   search — query a self-hosted SearXNG JSON API; returns ranked
 *     title/url/snippet results (snippets only — the caller must fetch
 *     a result URL to read the page itself).
 *   fetch — GET a single public http(s) URL and return readable text.
 *     SSRF-guarded: hostnames resolving to private/loopback/link-local/
 *     CGNAT ranges are refused, redirects are re-checked per hop, and
 *     responses are size- and time-capped.
 *
 * This is the only component of the replicator that ever touches raw
 * external content; the meditate skill's main agent still never fetches
 * sources itself.
 *
 * Endpoint: SEARXNG_ENDPOINT env var, default http://searxng:8080 (the
 * compose stack name on the docker searxng network).
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { lookup } from "node:dns/promises";

const SEARXNG_URL = (process.env.SEARXNG_ENDPOINT ?? "http://searxng:8080").replace(/\/+$/, "");
const MAX_FETCH_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;
const MAX_REDIRECTS = 5;
const MAX_TEXT_CHARS = 16_000;

function ipv4InRange(ip: string, base: number, bits: number): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return false;
  const value = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (value & mask) === (base & mask);
}

function isPrivateAddress(address: string): boolean {
  const lower = address.toLowerCase();
  if (!lower.includes(":")) {
    // 0/8, 10/8, 100.64/10 (CGNAT + Tailscale), 127/8, 169.254/16, 172.16/12,
    // 192.168/16, 224/4 (multicast)
    return (
      ipv4InRange(lower, 0x00000000, 8) ||
      ipv4InRange(lower, 0x0a000000, 8) ||
      ipv4InRange(lower, 0x64400000, 10) ||
      ipv4InRange(lower, 0x7f000000, 8) ||
      ipv4InRange(lower, 0xa9fe0000, 16) ||
      ipv4InRange(lower, 0xac100000, 12) ||
      ipv4InRange(lower, 0xc0a80000, 16) ||
      ipv4InRange(lower, 0xe0000000, 4)
    );
  }
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("::ffff:")) {
    return isPrivateAddress(lower.slice("::ffff:".length));
  }
  if (/^f[cd]/.test(lower)) return true; // fc00::/7 unique local
  if (/^fe[89ab]/.test(lower)) return true; // fe80::/10 link-local
  return false;
}

async function assertPublicHost(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`fetch only supports http/https URLs (got ${url.protocol}//)`);
  }
  const hostname = url.hostname;
  if (hostname === "localhost") {
    throw new Error("fetch refused: localhost is not an external source");
  }
  let addresses: string[];
  try {
    addresses = (await lookup(hostname, { all: true, verbatim: true })).map((a) => a.address);
  } catch {
    throw new Error(`fetch refused: could not resolve ${hostname}`);
  }
  const privateOnes = addresses.filter(isPrivateAddress);
  if (privateOnes.length > 0) {
    throw new Error(
      `fetch refused: ${hostname} resolves to a private/internal address (${privateOnes[0]}) — quarantine only fetches external sources`,
    );
  }
}

async function httpGet(
  url: URL,
): Promise<{ text: string; finalUrl: string; contentType: string | null }> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": "replicator-quarantine/1.0 (skill-discovery)",
          accept:
            "text/html,application/xhtml+xml,application/xml,application/rss+xml,application/atom+xml,application/json,text/plain;q=0.9,*/*;q=0.8",
        },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) throw new Error(`redirect (${res.status}) with no Location header`);
        current = new URL(loc, current);
        continue;
      }
      if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status} ${res.statusText}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_FETCH_BYTES) {
        throw new Error(`fetch aborted: response exceeds ${MAX_FETCH_BYTES} bytes`);
      }
      return { text: buf.toString("utf8"), finalUrl: current.href, contentType: res.headers.get("content-type") };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`fetch timed out after ${FETCH_TIMEOUT_MS}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`fetch aborted: more than ${MAX_REDIRECTS} redirects`);
}

function htmlToText(html: string): string {
  let s = html;
  s = s.replace(/<(script|style|noscript|template)[\s\S]*?<\/\1>/gi, " ");
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  s = s.replace(/<[^>]+>/g, " ");
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/");
  return s.replace(/\s+/g, " ").trim();
}

function readableText(raw: string, contentType: string | null): string {
  const ct = (contentType ?? "").toLowerCase();
  if (ct.includes("json")) {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      // fall through — treat as plain text
    }
  }
  if (ct.includes("html") || /^\s*</.test(raw)) {
    return htmlToText(raw);
  }
  return raw;
}

const server = new Server(
  { name: "replicator-web", version: "0.9.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search",
      description:
        "Search the web through a self-hosted SearXNG instance; returns ranked results with title, URL, and snippet. Use to locate the actual material when given only a topic or description. Results are snippets, not full content — call fetch on a result URL to read the page itself.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query." },
          limit: { type: "number", description: "Max results to return (default 10, max 20)." },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
    {
      name: "fetch",
      description:
        "Fetch a single external http(s) URL and return its readable text content (HTML stripped to text, JSON pretty-printed). Public URLs only — hostnames resolving to private/internal addresses are refused. Use to read a page, post, or feed entry you were asked to evaluate.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "The http(s) URL to fetch." },
        },
        required: ["url"],
        additionalProperties: false,
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "search") {
    const query = args?.query;
    if (typeof query !== "string" || query.trim() === "") {
      throw new Error("search requires a non-empty 'query' string");
    }
    const limit =
      typeof args?.limit === "number" ? Math.max(1, Math.min(20, Math.floor(args.limit))) : 10;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(`${SEARXNG_URL}/search?q=${encodeURIComponent(query)}&format=json`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`SearXNG returned HTTP ${res.status}`);
      const data = (await res.json()) as {
        results?: Array<{ title?: string; url?: string; content?: string }>;
        unresponsive_engines?: Array<unknown>;
      };
      const results = (data.results ?? []).slice(0, limit);
      const engines = data.unresponsive_engines ?? [];
      const lines = [`Query: ${query}`, `Results: ${results.length}`];
      if (results.length === 0) lines.push("\nNo results.");
      results.forEach((r, i) => {
        lines.push(`\n${i + 1}. ${r.title ?? ""}\n   ${r.url ?? ""}\n   ${r.content ?? ""}`);
      });
      if (engines.length > 0) {
        lines.push(
          `\n(engines that did not respond: ${engines.map((e) => (Array.isArray(e) ? String(e[0]) : String(e))).join(", ")})`,
        );
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
    } finally {
      clearTimeout(timer);
    }
  }

  if (name === "fetch") {
    const urlRaw = args?.url;
    if (typeof urlRaw !== "string" || urlRaw.trim() === "") {
      throw new Error("fetch requires a 'url' string");
    }
    let url: URL;
    try {
      url = new URL(urlRaw);
    } catch {
      throw new Error(`fetch: invalid URL: ${urlRaw}`);
    }
    const { text, finalUrl, contentType } = await httpGet(url);
    const body = readableText(text, contentType);
    const truncated = body.length > MAX_TEXT_CHARS;
    return {
      content: [
        {
          type: "text",
          text: `Source: ${finalUrl}\nContent length: ${body.length} chars${
            truncated ? ` (truncated to ${MAX_TEXT_CHARS})` : ""
          }\n\n${truncated ? body.slice(0, MAX_TEXT_CHARS) : body}`,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);