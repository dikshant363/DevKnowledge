#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

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
      prompts: {},
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
interface ApiResult<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
}

async function fetchApi<T = any>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (API_TOKEN) {
    headers["Authorization"] = `Bearer ${API_TOKEN}`;
  }

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errText = await res.text();
      return {
        ok: false,
        error: `API error ${res.status}: ${errText}`,
        status: res.status,
      };
    }
    const data = await res.json();
    return { ok: true, data, status: res.status };
  } catch (err: any) {
    return {
      ok: false,
      error: `Network error connecting to DevKnowledge API at ${url}: ${err.message}`,
    };
  }
}

// 2. Tool Execution Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "search_docs": {
      const qParams = new URLSearchParams();
      qParams.set("q", (args?.query as string) || "");
      if (args?.limit) qParams.set("limit", String(args.limit));
      if (args?.source_id) qParams.set("source_id", String(args.source_id));
      if (args?.category) qParams.set("category", String(args.category));

      const res = await fetchApi(`/api/v1/search?${qParams.toString()}`);
      if (!res.ok) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: res.error }, null, 2) }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }],
      };
    }

    case "get_document": {
      const docId = (args?.document_id as string) || "";
      const res = await fetchApi(`/api/v1/documents/${encodeURIComponent(docId)}`);
      if (!res.ok) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: res.error }, null, 2) }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }],
      };
    }

    case "get_api_reference": {
      const symbol = (args?.symbol_name as string) || "";
      const tech = (args?.technology as string) || "";
      const query = tech ? `${symbol} ${tech}` : symbol;

      const searchRes = await fetchApi(`/api/v1/search?q=${encodeURIComponent(query)}&limit=5`);
      if (!searchRes.ok) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: searchRes.error }, null, 2) }],
          isError: true,
        };
      }

      const results = searchRes.data?.results || [];
      const foundSymbols: any[] = [];

      for (const item of results.slice(0, 3)) {
        const docRes = await fetchApi(`/api/v1/documents/${encodeURIComponent(item.document_id)}`);
        if (docRes.ok && docRes.data?.api_symbols) {
          for (const s of docRes.data.api_symbols) {
            if (s.name.toLowerCase().includes(symbol.toLowerCase())) {
              foundSymbols.push({
                ...s,
                source_name: item.source_name,
                canonical_url: item.canonical_url,
              });
            }
          }
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                symbol_name: symbol,
                technology: tech || "any",
                matches_count: foundSymbols.length,
                symbols: foundSymbols,
                search_fallback: foundSymbols.length === 0 ? results : undefined,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "get_code_examples": {
      const tech = (args?.technology as string) || "";
      const topic = (args?.topic as string) || "";
      const query = `${tech} ${topic}`.trim();

      const searchRes = await fetchApi(`/api/v1/search?q=${encodeURIComponent(query)}&limit=5`);
      if (!searchRes.ok) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: searchRes.error }, null, 2) }],
          isError: true,
        };
      }

      const results = searchRes.data?.results || [];
      const snippets: any[] = [];

      for (const item of results.slice(0, 3)) {
        const docRes = await fetchApi(`/api/v1/documents/${encodeURIComponent(item.document_id)}`);
        if (docRes.ok && docRes.data?.code_snippets) {
          for (const snip of docRes.data.code_snippets) {
            snippets.push({
              ...snip,
              source_title: item.title,
              canonical_url: item.canonical_url,
            });
          }
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                technology: tech,
                topic,
                examples_count: snippets.length,
                examples: snippets,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "compare_doc_versions": {
      const snapId = (args?.snapshot_id as string) || "";
      const compareId = args?.compare_to_snapshot_id
        ? `?compare_to_snapshot_id=${encodeURIComponent(args.compare_to_snapshot_id as string)}`
        : "";
      const res = await fetchApi(`/api/v1/snapshots/${encodeURIComponent(snapId)}/diff${compareId}`);
      if (!res.ok) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: res.error }, null, 2) }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }],
      };
    }

    case "check_deprecated_api": {
      const symbol = (args?.symbol_name as string) || "";
      const searchRes = await fetchApi(`/api/v1/search?q=${encodeURIComponent(symbol)}&limit=5`);
      let isDeprecated = false;
      let notice = "No deprecation notice found.";

      if (searchRes.ok && searchRes.data?.results) {
        for (const item of searchRes.data.results) {
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

    case "check_compatibility": {
      const pkg = (args?.package_name as string) || "";
      const ver = (args?.version as string) || "";
      const target = (args?.target_framework as string) || "general";

      // Query sources matching package
      const res = await fetchApi(`/api/v1/search?q=${encodeURIComponent(pkg)}&limit=5`);
      const results = res.ok ? res.data?.results || [] : [];

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                package_name: pkg,
                version: ver,
                target_framework: target,
                documented_sources: results.map((r: any) => ({
                  name: r.source_name,
                  version: r.version,
                  canonical_url: r.canonical_url,
                })),
                status: results.length > 0 ? "verified_in_catalog" : "untracked_package",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "get_source_metadata": {
      const srcId = (args?.source_id as string) || "";
      const res = await fetchApi(`/api/v1/sources/${encodeURIComponent(srcId)}`);
      if (!res.ok) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: res.error }, null, 2) }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }],
      };
    }

    case "list_knowledge_sources": {
      const cat = args?.category ? `?category=${encodeURIComponent(args.category as string)}` : "";
      const res = await fetchApi(`/api/v1/sources${cat}`);
      if (!res.ok) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: res.error }, null, 2) }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }],
      };
    }

    case "get_project_knowledge": {
      const projId = (args?.project_id as string) || "";
      const res = await fetchApi(`/api/v1/projects/${encodeURIComponent(projId)}/knowledge`);
      if (!res.ok) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: res.error }, null, 2) }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }],
      };
    }

    default: {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2),
          },
        ],
        isError: true,
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
      {
        uri: "devknowledge://health",
        name: "DevKnowledge Gateway Health Status",
        mimeType: "application/json",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  if (uri === "devknowledge://sources/list") {
    const res = await fetchApi("/api/v1/sources");
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(res.data || { error: res.error }, null, 2),
        },
      ],
    };
  } else if (uri === "devknowledge://health") {
    const res = await fetchApi("/api/v1/health");
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(res.data || { error: res.error }, null, 2),
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

// 4. Prompt Definitions
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "query_doc",
        description: "Query technical documentation with source citation and version constraints",
        arguments: [
          {
            name: "query",
            description: "Technical question or concept",
            required: true,
          },
          {
            name: "technology",
            description: "Optional library or language filter",
            required: false,
          },
        ],
      },
      {
        name: "audit_dependencies",
        description: "Analyze project dependencies against documented sources for deprecations and version mismatches",
        arguments: [
          {
            name: "project_id",
            description: "Optional project profile UUID",
            required: false,
          },
        ],
      },
      {
        name: "api_lookup",
        description: "Look up API signature, parameters, and deprecation status for a symbol",
        arguments: [
          {
            name: "symbol_name",
            description: "Function, method, or class name",
            required: true,
          },
          {
            name: "technology",
            description: "Technology or library context",
            required: false,
          },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "query_doc": {
      const q = args?.query || "";
      const tech = args?.technology ? ` in the context of ${args.technology}` : "";
      return {
        description: "Query technical documentation with source citation",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please answer the following technical query using DevKnowledge documentation${tech}: "${q}". Cite canonical documentation URLs and verify version constraints.`,
            },
          },
        ],
      };
    }

    case "audit_dependencies": {
      const proj = args?.project_id ? ` for project profile '${args.project_id}'` : "";
      return {
        description: "Audit project dependencies for deprecations and version mismatch",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Audit the project dependencies${proj} against DevKnowledge documentation. Identify deprecated APIs, version mismatches, and suggest safe upgrades.`,
            },
          },
        ],
      };
    }

    case "api_lookup": {
      const sym = args?.symbol_name || "";
      const tech = args?.technology ? ` in ${args.technology}` : "";
      return {
        description: "Look up API symbol specifications and deprecations",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Lookup the API reference for '${sym}'${tech}. Provide function signature, parameters, return types, and any active deprecation notices.`,
            },
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
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
