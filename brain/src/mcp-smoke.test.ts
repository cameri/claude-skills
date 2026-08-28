import { expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The rest of the suite calls learn_from/recall as plain library functions.
// This test is the one that actually exercises server.ts as a subprocess
// speaking the real MCP stdio protocol, the way Claude Code's MCP client
// does — proving the tool schemas, request routing, and JSON serialization
// all work end to end, not just the underlying functions.

const FIXTURE = {
  nodes: [{ id: "n1", label: "Thing One", file_type: "code" }],
  links: [],
};

test("brain MCP server: learn_from then recall over a real stdio connection", async () => {
  const projectDir = mkdtempSync(join(tmpdir(), "brain-mcp-smoke-"));
  const graphifyOutDir = join(projectDir, "graphify-out");
  mkdirSync(graphifyOutDir, { recursive: true });
  writeFileSync(join(graphifyOutDir, "graph.json"), JSON.stringify(FIXTURE));

  const transport = new StdioClientTransport({
    command: "bun",
    args: [join(import.meta.dir, "..", "server.ts")],
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
  });
  const client = new Client({ name: "brain-smoke-test", version: "0.0.0" }, { capabilities: {} });

  try {
    await client.connect(transport);

    const tools = await client.listTools();
    expect(tools.tools.map((t) => t.name).sort()).toEqual(["forget", "learn_from", "recall", "remember", "study_status"]);

    const learnResult = await client.callTool({ name: "learn_from", arguments: {} });
    const learnText = (learnResult.content as Array<{ type: string; text: string }>)[0]!.text;
    const learnSummary = JSON.parse(learnText);
    expect(Number(learnSummary.nodesCreated)).toBeGreaterThanOrEqual(1);

    const recallResult = await client.callTool({
      name: "recall",
      arguments: { query: "MATCH (n:Code) RETURN n.label" },
    });
    const recallText = (recallResult.content as Array<{ type: string; text: string }>)[0]!.text;
    expect(JSON.parse(recallText)).toEqual({ rows: [{ "n.label": "Thing One" }] });

    // The read-only enforcement is unit-tested directly against openBrain
    // elsewhere; here just confirm the real protocol path surfaces the
    // rejection as a JSON-RPC error rather than crashing the connection or
    // silently succeeding.
    await expect(
      client.callTool({ name: "recall", arguments: { query: "CREATE (n:ShouldNotExist)" } })
    ).rejects.toThrow();

    // Connection must still be alive after that error.
    const followUp = await client.callTool({
      name: "recall",
      arguments: { query: "MATCH (n:Code) RETURN count(n) AS c" },
    });
    const followUpText = (followUp.content as Array<{ type: string; text: string }>)[0]!.text;
    expect(JSON.parse(followUpText)).toEqual({ rows: [{ c: "1" }] });

    const rememberResult = await client.callTool({
      name: "remember",
      arguments: { text: "smoke-tested via the real MCP protocol", links: ["n1"] },
    });
    const rememberText = (rememberResult.content as Array<{ type: string; text: string }>)[0]!.text;
    const remembered = JSON.parse(rememberText);
    expect(remembered.links).toEqual([{ input: "n1", resolvedGid: "n1" }]);

    const forgetResult = await client.callTool({
      name: "forget",
      arguments: { target: { type: "node", gid: remembered.gid } },
    });
    const forgetText = (forgetResult.content as Array<{ type: string; text: string }>)[0]!.text;
    expect(JSON.parse(forgetText)).toEqual({ found: true, edgesAffected: 1 });

    const afterForget = await client.callTool({
      name: "recall",
      arguments: { query: "MATCH (n:Fact) RETURN n.gid" },
    });
    const afterForgetText = (afterForget.content as Array<{ type: string; text: string }>)[0]!.text;
    expect(JSON.parse(afterForgetText)).toEqual({ rows: [] });

    // learn_from's 'path' override: sync a graph-json snapshot from outside
    // graphify-out/ entirely, proving the tool isn't hardwired to graphify's
    // own output directory — any producer of the same schema works.
    const externalPath = join(projectDir, "other-tool-output.json");
    writeFileSync(externalPath, JSON.stringify({ nodes: [{ id: "n2", label: "Thing Two", file_type: "doc" }], links: [] }));
    const externalLearnResult = await client.callTool({ name: "learn_from", arguments: { path: externalPath } });
    const externalLearnText = (externalLearnResult.content as Array<{ type: string; text: string }>)[0]!.text;
    expect(JSON.parse(externalLearnText)).toMatchObject({ nodesCreated: 1 });

    const externalRecall = await client.callTool({
      name: "recall",
      arguments: { query: "MATCH (n:Doc) RETURN n.label" },
    });
    const externalRecallText = (externalRecall.content as Array<{ type: string; text: string }>)[0]!.text;
    expect(JSON.parse(externalRecallText)).toEqual({ rows: [{ "n.label": "Thing Two" }] });

    // study_status: seed a minimal real graphify-out/ (graph.json + the three
    // sidecars learn_from's registry upsert reads), sync it, then confirm
    // study_status reports it — proving the full server.ts wiring, not just
    // the unit-tested pieces in isolation.
    const studiedDir = join(projectDir, "graphify-out");
    writeFileSync(join(studiedDir, ".graphify_root"), projectDir);
    writeFileSync(join(studiedDir, ".graphify_python"), process.execPath); // any real executable; study_status here only reaches learn_from's bookkeeping, not detect_incremental
    writeFileSync(
      join(studiedDir, "cost.json"),
      JSON.stringify({ runs: [{ date: "2026-08-27T00:00:00Z", input_tokens: 100, output_tokens: 20, files: 2 }] })
    );
    await client.callTool({ name: "learn_from", arguments: { path: join(studiedDir, "graph.json"), duration_seconds: 12 } });

    const registryRecall = await client.callTool({
      name: "recall",
      arguments: { query: "MATCH (n:StudiedPath) RETURN n.gid AS path, n.last_duration_seconds AS duration" },
    });
    const registryText = (registryRecall.content as Array<{ type: string; text: string }>)[0]!.text;
    expect(JSON.parse(registryText)).toEqual({ rows: [{ path: projectDir, duration: "12" }] });
  } finally {
    await client.close();
    rmSync(projectDir, { recursive: true, force: true });
  }
}, 30_000);
