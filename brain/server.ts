#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { join } from "node:path";
import { openBrain } from "./src/db";
import { syncSource } from "./src/learn-from";
import { graphifyOutAdapter } from "./src/sources/graphify-out";
import { recall } from "./src/recall";
import { remember } from "./src/remember";
import { forget } from "./src/forget";
import { jsonStringify } from "./src/json";

const server = new Server({ name: "brain", version: "0.2.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "learn_from",
      description: "Sync graphify-out/graph.json into the brain (create/update/delete, incremental).",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    {
      name: "recall",
      description: "Run a literal Cypher query against the brain and return matching rows.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Literal Cypher query." },
          parameters: { type: "object", description: "Optional query parameters." },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
    {
      name: "remember",
      description: "Write a single fact into the brain, optionally linked to existing nodes by gid or search string.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "The fact itself. Always full-text indexed." },
          properties: { type: "object", description: "Optional structured key/values alongside the text." },
          links: {
            type: "array",
            items: { type: "string" },
            description: "Each entry is either a known node gid, or a search string resolved via full-text search (top hit, best-effort).",
          },
        },
        required: ["text"],
        additionalProperties: false,
      },
    },
    {
      name: "forget",
      description: "Soft (default, recoverable) or permanent delete of a node or edge from the brain.",
      inputSchema: {
        type: "object",
        properties: {
          target: {
            oneOf: [
              {
                type: "object",
                properties: { type: { const: "node" }, gid: { type: "string" } },
                required: ["type", "gid"],
                additionalProperties: false,
              },
              {
                type: "object",
                properties: {
                  type: { const: "edge" },
                  sourceGid: { type: "string" },
                  targetGid: { type: "string" },
                  edgeType: { type: "string" },
                },
                required: ["type", "sourceGid", "targetGid", "edgeType"],
                additionalProperties: false,
              },
            ],
          },
          permanent: { type: "boolean", description: "Defaults to false (soft, recoverable). true is a real, permanent delete." },
        },
        required: ["target"],
        additionalProperties: false,
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "learn_from") {
    const db = await openBrain();
    try {
      const root = process.env.CLAUDE_PROJECT_DIR!; // resolveBrainPath already validated this is set
      const adapter = graphifyOutAdapter(join(root, "graphify-out", "graph.json"));
      const result = await syncSource(db, adapter);
      return { content: [{ type: "text", text: jsonStringify(result) }] };
    } finally {
      await db.close();
    }
  }
  if (request.params.name === "recall") {
    const { query, parameters } = request.params.arguments as { query: unknown; parameters?: Record<string, unknown> };
    if (typeof query !== "string") {
      throw new Error("recall requires a 'query' string parameter");
    }
    // Opened read-only: LatticeDB rejects any write — CREATE/DELETE/SET/MERGE/REMOVE
    // — at the database layer, not just at the transaction API. recall can never
    // mutate the brain, regardless of what Cypher a caller composes.
    const db = await openBrain(undefined, { readOnly: true });
    try {
      const result = await recall(db, query, parameters);
      return { content: [{ type: "text", text: jsonStringify(result) }] };
    } finally {
      await db.close();
    }
  }
  if (request.params.name === "remember") {
    const { text, properties, links } = request.params.arguments as {
      text: unknown;
      properties?: Record<string, unknown>;
      links?: unknown;
    };
    if (typeof text !== "string") {
      throw new Error("remember requires a 'text' string parameter");
    }
    const db = await openBrain();
    try {
      const result = await remember(db, text, properties ?? {}, (links as string[] | undefined) ?? []);
      return { content: [{ type: "text", text: jsonStringify(result) }] };
    } finally {
      await db.close();
    }
  }
  if (request.params.name === "forget") {
    const { target, permanent } = request.params.arguments as { target: unknown; permanent?: boolean };
    const db = await openBrain();
    try {
      const result = await forget(db, target as never, permanent ?? false);
      return { content: [{ type: "text", text: jsonStringify(result) }] };
    } finally {
      await db.close();
    }
  }
  throw new Error(`Unknown tool: ${request.params.name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
