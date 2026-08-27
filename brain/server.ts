#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { join } from "node:path";
import { openBrain, resolveBrainPath } from "./src/db";
import { syncSource } from "./src/learn-from";
import { graphifyOutAdapter } from "./src/sources/graphify-out";
import { recall } from "./src/recall";

const server = new Server({ name: "brain", version: "0.1.0" }, { capabilities: { tools: {} } });

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
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const db = await openBrain();
  try {
    if (request.params.name === "learn_from") {
      const root = process.env.CLAUDE_PROJECT_DIR!; // resolveBrainPath already validated this is set
      const adapter = graphifyOutAdapter(join(root, "graphify-out", "graph.json"));
      const result = await syncSource(db, adapter);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
    if (request.params.name === "recall") {
      const { query, parameters } = request.params.arguments as { query: string; parameters?: Record<string, unknown> };
      const result = await recall(db, query, parameters);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
    throw new Error(`Unknown tool: ${request.params.name}`);
  } finally {
    await db.close();
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
