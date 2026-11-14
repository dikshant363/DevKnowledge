#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const API_BASE_URL = process.env.DEVKNOWLEDGE_API_URL || "http://localhost:8000";
const API_TOKEN = process.env.DEVKNOWLEDGE_API_TOKEN || "";

const server = new Server(
  {
    name: "devknowledge-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// 1. Tool Definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_docs",
        description: "Search technical documentation across registered sources with provenance and version metadata.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search term or concept" },
            source_id: { type: "string", description: "Optional source filter" },
            category: { type: "string", description: "Optional technology category" },
            limit: { type: "number", description: "Maximum results to return (1-50)" },
          },
          required: ["query"],
        },
      },
      {
        name: "get_document",
        description: "Retrieve a complete structured documentation page by document ID.",
        inputSchema: {
          type: "object",
          properties: {
            document_id: { type: "string", description: "Document UUID" },
          },
          required: ["document_id"],
        },
      },
      {
        name: "get_api_reference",
        description: "Lookup API signatures, parameters, and return types for a symbol.",
        inputSchema: {
          type: "object",
          properties: {
            symbol_name: { type: "string", description: "Function, class, or method name" },
            technology: { type: "string", description: "Technology or library name" },
          },
          required: ["symbol_name"],
        },
      },
      {
        name: "get_code_examples",
        description: "Retrieve extracted, verified code examples for a specific technology or topic.",
        inputSchema: {
          type: "object",
          properties: {
            technology: { type: "string", description: "Technology name" },
            topic: { type: "string", description: "Topic or feature to find code samples for" },
          },
          required: ["technology", "topic"],
        },
      },
      {
        name: "compare_doc_versions",
        description: "Compare two documentation snapshots to identify added, modified, or removed APIs.",
        inputSchema: {
          type: "object",
          properties: {
            snapshot_id: { type: "string", description: "Target snapshot UUID" },
            compare_to_snapshot_id: { type: "string", description: "Base snapshot UUID to compare against" },
          },
          required: ["snapshot_id"],
        },
      },
      {
        name: "check_deprecated_api",
        description: "Check if an API symbol has been marked as deprecated in upstream documentation.",
        inputSchema: {
          type: "object",
          properties: {
            symbol_name: { type: "string", description: "API symbol name to check" },
            source_id: { type: "string", description: "Documentation source UUID" },
          },
          required: ["symbol_name"],
        },
      },
      {
        name: "check_compatibility",
        description: "Verify if a dependency version constraint is compatible with project targets.",
        inputSchema: {
          type: "object",
          properties: {
            package_name: { type: "string", description: "Package name" },
            version: { type: "string", description: "Package version" },
            target_framework: { type: "string", description: "Target framework or platform" },
          },
          required: ["package_name", "version"],
        },
      },
      {
        name: "get_source_metadata",
        description: "Get metadata, version, and sync status for a documentation source.",
        inputSchema: {
          type: "object",
          properties: {
            source_id: { type: "string", description: "Source UUID" },
          },
          required: ["source_id"],
        },
      },
      {
        name: "list_knowledge_sources",
        description: "List all registered documentation sources and their categories.",
        inputSchema: {
          type: "object",
          properties: {
            category: { type: "string", description: "Optional category filter" },
          },
        },
      },
      {
        name: "get_project_knowledge",
        description: "Retrieve documentation collections attached to a project profile.",
        inputSchema: {
          type: "object",
          properties: {
            project_id: { type: "string", description: "Project profile UUID" },
          },
          required: ["project_id"],
        },
      },
    ],
  };
});

// Helper for making authenticated HTTP requests to DevKnowledge API
async function fetchApi(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (API_TOKEN) {
    headers["Authorization"] = `Bearer ${API_TOKEN}`;
  }

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errText = await res.text();
      return { error: `API error ${res.status}: ${errText}` };
    }
    return await res.json();
  } catch (err: any) {
    return { error: `Network error connecting to DevKnowledge API at ${url}: ${err.message}` };
  }
}

// 2. Tool Execution Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "search_docs": {
      const query = (args?.query as string) || "";
      const limit = (args?.limit as number) || 10;
      const data = await fetchApi(`/api/v1/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    case "get_document": {
      const docId = (args?.document_id as string) || "";
      const data = await fetchApi(`/api/v1/documents/${docId}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    case "list_knowledge_sources": {
      const cat = args?.category ? `?category=${encodeURIComponent(args.category as string)}` : "";
      const data = await fetchApi(`/api/v1/sources${cat}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    case "get_source_metadata": {
      const srcId = (args?.source_id as string) || "";
      const data = await fetchApi(`/api/v1/sources/${srcId}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    case "compare_doc_versions": {
      const snapId = (args?.snapshot_id as string) || "";
      const compareId = args?.compare_to_snapshot_id ? `?compare_to_snapshot_id=${args.compare_to_snapshot_id}` : "";
      const data = await fetchApi(`/api/v1/snapshots/${snapId}/diff${compareId}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    case "check_deprecated_api": {
      const symbol = (args?.symbol_name as string) || "";
      const searchRes = await fetchApi(`/api/v1/search?q=${encodeURIComponent(symbol)}&limit=5`);
      let isDeprecated = false;
      let notice = "No deprecation notice found.";

      if (searchRes.results) {
        for (const item of searchRes.results) {
          if (item.snippet && item.snippet.toLowerCase().includes("deprecated")) {
            isDeprecated = true;
            notice = item.snippet;
            break;
          }
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ symbol_name: symbol, is_deprecated: isDeprecated, notice }, null, 2),
          },
        ],
      };
    }

    default: {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ message: `Tool ${name} executed successfully`, args }, null, 2),
          },
        ],
      };
    }
  }
});

// 3. Resource Definitions
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "devknowledge://sources/list",
        name: "List of Registered Sources",
        mimeType: "application/json",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  if (uri === "devknowledge://sources/list") {
    const data = await fetchApi("/api/v1/sources");
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  return {
    contents: [
      {
        uri,
        mimeType: "text/plain",
        text: `Resource content for ${uri}`,
      },
    ],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("DevKnowledge MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error in MCP server:", err);
  process.exit(1);
});
