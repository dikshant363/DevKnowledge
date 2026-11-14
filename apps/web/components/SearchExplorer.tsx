"use client";

import React, { useState } from "react";
import {
  Search,
  Filter,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Code2,
  BookOpen,
  Terminal,
  ShieldCheck,
  X,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import { SearchResult } from "@devknowledge/canonical-schema";

interface ExtendedSearchResult extends SearchResult {
  technology: string;
  symbol_type?: string;
  code_snippet?: string;
  language?: string;
  provenance_hash: string;
}

const SAMPLE_SEARCH_RESULTS: ExtendedSearchResult[] = [
  {
    document_id: "doc-tokio-task-spawn",
    source_id: "src-1",
    technology: "Tokio",
    version: "1.38.0",
    title: "Function tokio::task::spawn",
    canonical_url: "https://docs.rs/tokio/1.38.0/tokio/task/fn.spawn.html",
    section_heading: "Spawning Asynchronous Tasks",
    snippet:
      "Spawns a new asynchronous task, returning a JoinHandle for it. The task begins running immediately on the current multi-threaded Tokio runtime.",
    score: 0.98,
    symbol_type: "function",
    code_snippet: `use tokio::task;\n\n#[tokio::main]\nasync fn main() {\n    let handle = task::spawn(async {\n        \"task result\"\n    });\n    let result = handle.await.unwrap();\n}`,
    language: "rust",
    provenance_hash: "sha256:7f4a2b91c8e3",
  },
  {
    document_id: "doc-axum-router",
    source_id: "src-2",
    technology: "Axum",
    version: "0.7.5",
    title: "Struct axum::Router",
    canonical_url: "https://docs.rs/axum/0.7.5/axum/routing/struct.Router.html",
    section_heading: "Routing & Nested Routes",
    snippet:
      "The central routing type for Axum web applications. Composes route endpoints with nested sub-routers and shared state injection via WithState.",
    score: 0.92,
    symbol_type: "struct",
    code_snippet: `let app = Router::new()\n    .route(\"/api/v1/search\", get(search_handler))\n    .with_state(app_state);`,
    language: "rust",
    provenance_hash: "sha256:3d1e998a442b",
  },
  {
    document_id: "doc-fastapi-depends",
    source_id: "src-4",
    technology: "FastAPI",
    version: "0.111.0",
    title: "Dependency Injection with Depends",
    canonical_url: "https://fastapi.tiangolo.com/tutorial/dependencies/",
    section_heading: "Sub-dependencies & Scopes",
    snippet:
      "FastAPI provides an extensible dependency injection system using Depends. Injects database sessions, authentication credentials, and request context.",
    score: 0.88,
    symbol_type: "function",
    code_snippet: `from fastapi import Depends, FastAPI\n\nasync def get_db():\n    db = DBSession()\n    try:\n        yield db\n    finally:\n        db.close()\n\n@app.get(\"/users\")\nasync def read_users(db: Session = Depends(get_db)):\n    return db.query(User).all()`,
    language: "python",
    provenance_hash: "sha256:1a84f50912cb",
  },
  {
    document_id: "doc-swiftui-state",
    source_id: "src-5",
    technology: "SwiftUI",
    version: "iOS 17.5",
    title: "State and Data Flow in SwiftUI",
    canonical_url: "https://developer.apple.com/documentation/swiftui/state",
    section_heading: "Property Wrapper @State and Observable",
    snippet:
      "Manage persistent state for a view hierarchy. Changing a state property invalidates view appearance and triggers automatic sub-tree body re-evaluation.",
    score: 0.84,
    symbol_type: "property_wrapper",
    code_snippet: `@Observable\nclass DocumentModel {\n    var isSynchronized: Bool = true\n}`,
    language: "swift",
    provenance_hash: "sha256:b8912cd310fe",
  },
];

export function SearchExplorer() {
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"hybrid" | "vector" | "fulltext">("hybrid");
  const [selectedTech, setSelectedTech] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredResults = SAMPLE_SEARCH_RESULTS.filter((res) => {
    const matchesQuery =
      !query ||
      res.title.toLowerCase().includes(query.toLowerCase()) ||
      res.snippet.toLowerCase().includes(query.toLowerCase()) ||
      res.technology.toLowerCase().includes(query.toLowerCase()) ||
      (res.code_snippet && res.code_snippet.toLowerCase().includes(query.toLowerCase()));

    const matchesTech =
      selectedTech === "all" || res.technology.toLowerCase() === selectedTech.toLowerCase();

    return matchesQuery && matchesTech;
  });

  const handleCopyAgentContext = (res: ExtendedSearchResult) => {
    const promptContext = `### Documentation Reference: ${res.title}
- **Source**: ${res.canonical_url}
- **Technology**: ${res.technology} (v${res.version})
- **Provenance Hash**: ${res.provenance_hash}
- **Section**: ${res.section_heading}

${res.snippet}

\`\`\`${res.language || "text"}
${res.code_snippet || ""}
\`\`\`
`;
    navigator.clipboard?.writeText(promptContext);
    setCopiedId(res.document_id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Search Header Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Search Explorer
          </h2>
          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-mono font-semibold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
            pgvector & Trigram
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Query canonical technical documentation, verified code snippets, and API signatures with provenance links.
        </p>

        {/* Input Bar */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by API symbol (e.g. spawn, Router, Depends), keyword, or task..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-8 text-xs text-slate-900 placeholder-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100 astryx-focus"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Search Mode Selector */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-850 shrink-0">
            <button
              onClick={() => setSearchMode("hybrid")}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                searchMode === "hybrid"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              } astryx-focus`}
            >
              Hybrid
            </button>
            <button
              onClick={() => setSearchMode("vector")}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                searchMode === "vector"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              } astryx-focus`}
            >
              Semantic Vector
            </button>
            <button
              onClick={() => setSearchMode("fulltext")}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                searchMode === "fulltext"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              } astryx-focus`}
            >
              Full-Text
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 mr-1 flex items-center gap-1">
            <SlidersHorizontal className="h-3 w-3" /> Filter:
          </span>
          {["all", "tokio", "axum", "fastapi", "swiftui"].map((tech) => (
            <button
              key={tech}
              onClick={() => setSelectedTech(tech)}
              className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize transition ${
                selectedTech === tech
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              } astryx-focus`}
            >
              {tech}
            </button>
          ))}
        </div>
      </div>

      {/* Results Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>Found {filteredResults.length} matching documentation entries</span>
          <span>Ranking: Hybrid Fused Score</span>
        </div>

        {filteredResults.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-[#0f172a]">
            No matching documents found for your query. Try searching for &ldquo;spawn&rdquo;, &ldquo;Router&rdquo;, or &ldquo;Depends&rdquo;.
          </div>
        ) : (
          filteredResults.map((result) => (
            <div
              key={result.document_id}
              className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs hover:border-slate-300 dark:border-slate-800 dark:bg-[#0f172a] dark:hover:border-slate-700 transition"
            >
              {/* Top metadata strip */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                    {result.technology} v{result.version}
                  </span>
                  {result.symbol_type && (
                    <span className="rounded bg-blue-50 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {result.symbol_type}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                    <ShieldCheck className="h-3 w-3" /> Canonical
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full bg-sky-500"
                        style={{ width: `${result.score * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">
                      {(result.score * 100).toFixed(0)}% Match
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyAgentContext(result)}
                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 transition astryx-focus"
                    title="Copy documentation block with provenance citations for AI prompt"
                  >
                    {copiedId === result.document_id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 text-slate-400" />
                        <span>Copy for Agent</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Title & Section */}
              <div className="mt-2.5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {result.title}
                </h3>
                {result.section_heading && (
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                    Section: {result.section_heading}
                  </div>
                )}
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {result.snippet}
                </p>
              </div>

              {/* Code snippet if present */}
              {result.code_snippet && (
                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-[#070a12] dark:border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-3 py-1 text-[10px] font-mono text-slate-400">
                    <span>Verified Code Example</span>
                    <span className="uppercase">{result.language}</span>
                  </div>
                  <pre className="p-3 text-xs font-mono overflow-x-auto text-emerald-300">
                    <code>{result.code_snippet}</code>
                  </pre>
                </div>
              )}

              {/* Provenance Footer */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800/80">
                <a
                  href={result.canonical_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                >
                  <span>{result.canonical_url}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>

                <span className="font-mono text-[10px] text-slate-400">
                  Provenance: {result.provenance_hash.substring(0, 18)}...
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
