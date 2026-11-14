"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Terminal,
  Copy,
  Check,
  ShieldCheck,
  Code2,
  BookOpen,
  Layers,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { ActiveTab } from "./NavigationShell";

interface McpIntegrationProps {
  onNavigate?: (tab: ActiveTab) => void;
}

export function McpIntegration({ onNavigate }: McpIntegrationProps) {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const mcpTools = [
    { name: "search_docs", desc: "Full-text and semantic vector retrieval across indexed technical documentation.", params: "query, source_id, version, limit" },
    { name: "get_document", desc: "Retrieve complete structured document with section hierarchy and content hash.", params: "document_id, canonical_url" },
    { name: "get_api_reference", desc: "Look up API function signatures, parameters, types, and deprecation flags.", params: "symbol_name, technology, version" },
    { name: "get_code_examples", desc: "Extract syntax-validated code snippets and usage examples.", params: "technology, query, language" },
    { name: "get_project_knowledge", desc: "Retrieve pinned documentation context matching project manifest constraints.", params: "project_id, manifest_type" },
    { name: "list_sources", desc: "List tracked documentation sources and their active version pins.", params: "category, limit" },
    { name: "get_source_status", desc: "Inspect current synchronization status and active CKR snapshot hash.", params: "source_id" },
    { name: "trigger_sync", desc: "Enqueue an on-demand incremental synchronization crawl.", params: "source_id, force_full" },
    { name: "discover_technology", desc: "Query the dynamic technology catalog and official documentation portals.", params: "name, ecosystem" },
    { name: "get_technology_hierarchy", desc: "Retrieve multi-parent ecosystem tree (e.g. Apple -> Swift -> SwiftUI).", params: "technology_id" },
  ];

  const claudeDesktopConfig = `{
  "mcpServers": {
    "devknowledge": {
      "command": "node",
      "args": ["/Users/username/Desktop/DevKnowledge/packages/mcp-server/dist/index.js"],
      "env": {
        "DEVKNOWLEDGE_API_URL": "http://127.0.0.1:8000"
      }
    }
  }
}`;

  const antigravityConfig = `// Antigravity MCP Server Configuration
{
  "name": "devknowledge",
  "transport": "stdio",
  "command": "node",
  "args": ["packages/mcp-server/dist/index.js"],
  "env": {
    "DEVKNOWLEDGE_API_URL": "http://127.0.0.1:8000"
  }
}`;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Model Context Protocol (MCP) Server Workbench
          </h1>
          <span className="rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-mono font-semibold text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-300">
            10 Tools • 3 Prompts • 2 Resources
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Universal standard for connecting AI coding agents directly to version-pinned documentation context.
        </p>
      </div>

      {/* Two Column Layout: Tools List & Client Configs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: 10 MCP Tools Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-[#0c101d] overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Registered MCP Tools (TypeScript Server)
            </h2>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[500px] overflow-y-auto">
            {mcpTools.map((t) => (
              <div key={t.name} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                    {t.name}()
                  </span>
                  <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 font-mono text-[9px] text-slate-600 dark:text-slate-400">
                    Tool
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {t.desc}
                </p>
                <div className="mt-1.5 text-[10px] font-mono text-slate-400">
                  Params: <span className="text-slate-700 dark:text-slate-300">{t.params}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Client Integration Snippets */}
        <div className="space-y-4">
          {/* Claude Desktop Config */}
          <div className="rounded-xl border border-slate-800 bg-[#070a12] p-4 text-xs font-mono text-slate-200 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-slate-400">
              <span className="font-bold text-[11px] text-yellow-400">Claude Desktop (claude_desktop_config.json)</span>
              <button
                onClick={() => handleCopy("claude", claudeDesktopConfig)}
                className="hover:text-white flex items-center gap-1 text-[11px]"
              >
                {copiedSnippet === "claude" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedSnippet === "claude" ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <pre className="overflow-x-auto text-[11px] text-slate-300">
              <code>{claudeDesktopConfig}</code>
            </pre>
          </div>

          {/* Antigravity & Cursor Config */}
          <div className="rounded-xl border border-slate-800 bg-[#070a12] p-4 text-xs font-mono text-slate-200 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-slate-400">
              <span className="font-bold text-[11px] text-cyan-400">Antigravity / Cursor Configuration</span>
              <button
                onClick={() => handleCopy("antigravity", antigravityConfig)}
                className="hover:text-white flex items-center gap-1 text-[11px]"
              >
                {copiedSnippet === "antigravity" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedSnippet === "antigravity" ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <pre className="overflow-x-auto text-[11px] text-slate-300">
              <code>{antigravityConfig}</code>
            </pre>
          </div>

          {/* Stdio Protocol Verification */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <div className="flex items-center gap-2 font-bold mb-1">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Model Context Protocol v2024-11-05 Specification Compliant</span>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-400">
              Supports JSON-RPC 2.0 over standard I/O (stdio) and Server-Sent Events (SSE). Untrusted web content is sanitized to prevent prompt injection into host agents.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
