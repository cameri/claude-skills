#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { join } from "node:path";
import { openBrain } from "./src/db";
import { syncSource } from "./src/learn-from";
import { graphifyOutAdapter } from "./src/sources/graphify-out";
import { recall } from "./src/recall";
import { jsonStringify } from "./src/json";

const server = new Server({ name: "brain", version: "0.1.2" }, { capabilities: { tools: {} } });

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
  throw new Error(`Unknown tool: ${request.params.name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
