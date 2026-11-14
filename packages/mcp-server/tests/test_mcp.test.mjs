import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(__dirname, "../dist/index.js");

async function runTest() {
  console.log("Testing DevKnowledge MCP Server Comprehensive Protocol Compliance...");
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
  console.log("[✓] Client connected to DevKnowledge MCP server via stdio transport");

  // 1. Verify Tools
  const tools = await client.listTools();
  assert(tools.tools.length >= 10, "Must expose at least 10 tools");
  const toolNames = tools.tools.map((t) => t.name);
  const requiredTools = [
    "search_docs",
    "get_document",
    "get_api_reference",
    "get_code_examples",
    "compare_doc_versions",
    "check_deprecated_api",
    "check_compatibility",
    "get_source_metadata",
    "list_knowledge_sources",
    "get_project_knowledge",
  ];
  for (const req of requiredTools) {
    assert(toolNames.includes(req), `Must include tool: ${req}`);
  }
  console.log(`[✓] Tool Discovery: Verified all ${tools.tools.length} MCP tools`);

  // 2. Call Tool: check_deprecated_api
  const depRes = await client.callTool({
    name: "check_deprecated_api",
    arguments: {
      symbol_name: "ReactDOM.render",
    },
  });
  assert(depRes.content.length > 0, "Tool call should return content");
  assert(depRes.content[0].type === "text", "Content type should be text");
  console.log("[✓] Executed tool: check_deprecated_api");

  // 3. Call Tool: check_compatibility
  const compatRes = await client.callTool({
    name: "check_compatibility",
    arguments: {
      package_name: "react",
      version: "^18.2.0",
      target_framework: "Next.js 14",
    },
  });
  assert(compatRes.content.length > 0, "Compatibility call should return content");
  console.log("[✓] Executed tool: check_compatibility");

  // 4. Call Tool: get_api_reference
  const apiRefRes = await client.callTool({
    name: "get_api_reference",
    arguments: {
      symbol_name: "useState",
      technology: "react",
    },
  });
  assert(apiRefRes.content.length > 0, "API reference tool should return content");
  console.log("[✓] Executed tool: get_api_reference");

  // 5. Call Tool: get_code_examples
  const codeRes = await client.callTool({
    name: "get_code_examples",
    arguments: {
      technology: "rust",
      topic: "error handling",
    },
  });
  assert(codeRes.content.length > 0, "Code examples tool should return content");
  console.log("[✓] Executed tool: get_code_examples");

  // 6. Verify Error Handling on Unknown Tool
  const errRes = await client.callTool({
    name: "non_existent_tool",
    arguments: {},
  });
  assert(errRes.isError === true, "Unknown tool must return isError = true");
  console.log("[✓] Error Handling: Verified isError=true for unknown tool");

  // 7. Verify Resources
  const resources = await client.listResources();
  assert(resources.resources.length >= 2, "Must expose resources");
  const resourceUris = resources.resources.map((r) => r.uri);
  assert(resourceUris.includes("devknowledge://sources/list"), "Must expose sources list resource");
  assert(resourceUris.includes("devknowledge://health"), "Must expose health resource");
  console.log(`[✓] Resource Discovery: Verified ${resources.resources.length} MCP resources`);

  // 8. Read Resource
  const readRes = await client.readResource({
    uri: "devknowledge://sources/list",
  });
  assert(readRes.contents.length > 0, "Resource read should return contents");
  console.log("[✓] Read Resource: Verified devknowledge://sources/list");

  // 9. Verify Prompts
  const prompts = await client.listPrompts();
  assert(prompts.prompts.length >= 3, "Must expose at least 3 prompt templates");
  const promptNames = prompts.prompts.map((p) => p.name);
  assert(promptNames.includes("query_doc"), "Must expose query_doc prompt");
  assert(promptNames.includes("audit_dependencies"), "Must expose audit_dependencies prompt");
  assert(promptNames.includes("api_lookup"), "Must expose api_lookup prompt");
  console.log(`[✓] Prompt Discovery: Verified ${prompts.prompts.length} prompt templates`);

  // 10. Get Prompt
  const promptData = await client.getPrompt({
    name: "query_doc",
    arguments: {
      query: "How to configure SQLite WAL mode in Rust?",
      technology: "rust",
    },
  });
  assert(promptData.messages.length > 0, "Prompt should return messages");
  assert(promptData.messages[0].content.text.includes("SQLite WAL mode"), "Prompt message should include query");
  console.log("[✓] Get Prompt: Successfully rendered 'query_doc' prompt");

  await client.close();
  console.log("All DevKnowledge MCP Protocol Compliance Tests Passed Successfully!");
}

runTest().catch((err) => {
  console.error("MCP test failed:", err);
  process.exit(1);
});
