import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(__dirname, "../dist/index.js");

async function runTest() {
  console.log("Testing DevKnowledge MCP Server...");
  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
    env: {
      DEVKNOWLEDGE_API_URL: "http://localhost:8000",
      PATH: process.env.PATH,
    },
  });

  const client = new Client(
    {
      name: "test-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);
  console.log("[✓] Client connected to DevKnowledge MCP server");

  // 1. List tools
  const tools = await client.listTools();
  assert(tools.tools.length >= 10, "Must expose at least 10 tools");
  const toolNames = tools.tools.map((t) => t.name);
  assert(toolNames.includes("search_docs"), "Must include search_docs tool");
  assert(toolNames.includes("get_document"), "Must include get_document tool");
  assert(toolNames.includes("check_deprecated_api"), "Must include check_deprecated_api tool");
  console.log(`[✓] Discovered ${tools.tools.length} MCP tools`);

  // 2. Call check_deprecated_api tool
  const result = await client.callTool({
    name: "check_deprecated_api",
    arguments: {
      symbol_name: "ReactDOM.render",
    },
  });
  assert(result.content.length > 0, "Tool call should return content");
  console.log("[✓] Executed check_deprecated_api successfully");

  await client.close();
  console.log("MCP Server Test Passed Successfully!");
}

runTest().catch((err) => {
  console.error("MCP test failed:", err);
  process.exit(1);
});
