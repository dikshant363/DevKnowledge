"use client";

import React, { useState } from "react";
import {
  Database,
  FileCode,
  FolderTree,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
  Code2,
  BookOpen,
  Hash,
  Terminal,
} from "lucide-react";
import { CanonicalDocument } from "@devknowledge/canonical-schema";

const SAMPLE_ARTIFACTS: Record<string, CanonicalDocument> = {
  "tokio-spawn": {
    id: "doc-tokio-task-spawn",
    source_id: "src-1",
    canonical_url: "https://docs.rs/tokio/1.38.0/tokio/task/fn.spawn.html",
    normalized_path: "/tokio/task/fn.spawn",
    title: "Function tokio::task::spawn",
    sections: [
      {
        id: "sec-overview",
        heading: "Overview & Spawning Semantics",
        level: 2,
        content:
          "Spawns a new asynchronous task, returning a JoinHandle for it. The provided future will start running in the background immediately when spawn is called, even if you don't await the returned JoinHandle.",
        content_hash: "sha256:7a8b9c1d",
      },
      {
        id: "sec-concurrency",
        heading: "Actor Concurrency & Panic Safety",
        level: 2,
        content:
          "Tasks spawned with tokio::task::spawn must implement 'static + Send + Send. If the spawned task panics, awaiting the JoinHandle will return an Err containing the panic error payload, isolating failures from parent tasks.",
        content_hash: "sha256:5e6f7a8b",
      },
    ],
    code_snippets: [
      {
        language: "rust",
        code: `use tokio::task;\n\n#[tokio::main]\nasync fn main() {\n    let handle = task::spawn(async {\n        // Perform background async work\n        \"task result\"\n    });\n\n    let result = handle.await.unwrap();\n    assert_eq!(result, \"task result\");\n}`,
        description: "Spawning an async task and awaiting its JoinHandle",
        line_count: 11,
      },
      {
        language: "rust",
        code: `use tokio::time::{sleep, Duration};\n\ntask::spawn(async {\n    sleep(Duration::from_millis(100)).await;\n    println!(\"Background task finished\");\n});`,
        description: "Detached fire-and-forget background task execution",
        line_count: 6,
      },
    ],
    api_symbols: [
      {
        name: "spawn",
        symbol_type: "function",
        signature: "pub fn spawn<T>(future: T) -> JoinHandle<T::Output> where T: Future + Send + 'static, T::Output: Send + 'static",
        description: "Spawns a new asynchronous task on the current multi-threaded runtime.",
        is_deprecated: false,
      },
    ],
    content_hash: "sha256:7f4a2b91c8e3",
    status: "indexed",
    updated_at: "2026-11-14T18:04:25Z",
  },
  "tokio-mpsc": {
    id: "doc-tokio-sync-mpsc",
    source_id: "src-1",
    canonical_url: "https://docs.rs/tokio/1.38.0/tokio/sync/mpsc/index.html",
    normalized_path: "/tokio/sync/mpsc",
    title: "Module tokio::sync::mpsc",
    sections: [
      {
        id: "sec-mpsc-intro",
        heading: "Multi-producer, single-consumer channel",
        level: 2,
        content:
          "A multi-producer, single-consumer queue for sending values between asynchronous tasks. Features bounded backpressure to avoid unbounded memory growth under high message throughput.",
        content_hash: "sha256:33ab11cd",
      },
    ],
    code_snippets: [
      {
        language: "rust",
        code: `use tokio::sync::mpsc;\n\n#[tokio::main]\nasync fn main() {\n    let (tx, mut rx) = mpsc::channel(32);\n\n    tokio::spawn(async move {\n        tx.send(\"sending value\").await.unwrap();\n    });\n\n    assert_eq!(rx.recv().await, Some(\"sending value\"));\n}`,
        description: "Bounded MPSC asynchronous message passing",
        line_count: 11,
      },
    ],
    api_symbols: [
      {
        name: "channel",
        symbol_type: "function",
        signature: "pub fn channel<T>(buffer: usize) -> (Sender<T>, Receiver<T>)",
        description: "Creates a bounded mpsc channel for communicating between tasks.",
        is_deprecated: false,
      },
    ],
    content_hash: "sha256:8899aabb",
    status: "indexed",
    updated_at: "2026-11-14T17:50:00Z",
  },
  "axum-router": {
    id: "doc-axum-routing-router",
    source_id: "src-2",
    canonical_url: "https://docs.rs/axum/0.7.5/axum/routing/struct.Router.html",
    normalized_path: "/axum/routing/struct.Router",
    title: "Struct axum::Router",
    sections: [
      {
        id: "sec-router-overview",
        heading: "Axum Routing & Middleware Chaining",
        level: 2,
        content:
          "The central routing type for Axum web applications. Composes route endpoints with nested sub-routers, shared state injection via WithState, and Tower middleware layers.",
        content_hash: "sha256:11223344",
      },
    ],
    code_snippets: [
      {
        language: "rust",
        code: `use axum::{routing::get, Router};\n\nlet app = Router::new()\n    .route(\"/health\", get(|| async { \"OK\" }))\n    .route(\"/api/v1/docs\", get(get_docs));`,
        description: "Axum Router initialization with route matching",
        line_count: 5,
      },
    ],
    api_symbols: [
      {
        name: "Router::new",
        symbol_type: "function",
        signature: "pub fn new() -> Router<()>",
        description: "Constructs an empty router instance with default unit state.",
        is_deprecated: false,
      },
    ],
    content_hash: "sha256:3d1e998a442b",
    status: "indexed",
    updated_at: "2026-11-14T16:20:00Z",
  },
};

export function ArtifactViewer() {
  const [selectedKey, setSelectedKey] = useState<string>("tokio-spawn");
  const [viewMode, setViewMode] = useState<"markdown" | "json">("markdown");
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const doc = SAMPLE_ARTIFACTS[selectedKey] || SAMPLE_ARTIFACTS["tokio-spawn"];

  const handleCopyHash = () => {
    navigator.clipboard?.writeText(doc.content_hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard?.writeText(JSON.stringify(doc, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownloadBundle = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(doc, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${doc.normalized_path.replace(/\//g, "_")}.ckr.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-[#0f172a]">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Canonical Knowledge Repository (CKR) Viewer
            </h2>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-mono font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              Schema v1.0
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Inspect canonical structured artifacts extracted from authoritative upstream documentation sources.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadBundle}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 transition astryx-focus"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CKR (.json)</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left Rail Hierarchy & Right Content Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Rail: Artifact Manifest Tree (4 Cols) */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0f172a] space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <FolderTree className="h-4 w-4 text-amber-500" />
              <span>Artifact Tree</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">3 artifacts</span>
          </div>

          <div className="space-y-1 text-xs">
            {/* Group 1: Tokio */}
            <div>
              <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Tokio (v1.38.0)
              </div>
              <button
                onClick={() => setSelectedKey("tokio-spawn")}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                  selectedKey === "tokio-spawn"
                    ? "bg-amber-50 font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-850"
                } astryx-focus`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">tokio::task::spawn</span>
                </div>
                <span className="font-mono text-[9px] text-slate-400 shrink-0">fn</span>
              </button>

              <button
                onClick={() => setSelectedKey("tokio-mpsc")}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                  selectedKey === "tokio-mpsc"
                    ? "bg-amber-50 font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-850"
                } astryx-focus`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">tokio::sync::mpsc</span>
                </div>
                <span className="font-mono text-[9px] text-slate-400 shrink-0">mod</span>
              </button>
            </div>

            {/* Group 2: Axum */}
            <div className="pt-2">
              <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Axum (v0.7.5)
              </div>
              <button
                onClick={() => setSelectedKey("axum-router")}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                  selectedKey === "axum-router"
                    ? "bg-amber-50 font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-850"
                } astryx-focus`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">axum::Router</span>
                </div>
                <span className="font-mono text-[9px] text-slate-400 shrink-0">struct</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Pane: Inspector (8 Cols) */}
        <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-[#0f172a] space-y-4">
          {/* Metadata bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-mono">
                  {doc.title}
                </h3>
                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.2 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <ShieldCheck className="h-3 w-3" /> Canonical Verified
                </span>
              </div>
              <a
                href={doc.canonical_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 hover:text-blue-600"
              >
                <span>{doc.canonical_url}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-850 shrink-0">
              <button
                onClick={() => setViewMode("markdown")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  viewMode === "markdown"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                } astryx-focus`}
              >
                Formatted Docs
              </button>
              <button
                onClick={() => setViewMode("json")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  viewMode === "json"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                } astryx-focus`}
              >
                Canonical JSON
              </button>
            </div>
          </div>

          {/* Provenance & Hash Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900/60 font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">Provenance Hash:</span>
              <code className="text-slate-800 dark:text-slate-200 text-[11px]">
                {doc.content_hash}
              </code>
              <button
                onClick={handleCopyHash}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Copy hash"
                aria-label="Copy hash"
              >
                {copiedHash ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>

            <div className="text-[10px] text-slate-400">
              Updated: {new Date(doc.updated_at).toLocaleDateString()}
            </div>
          </div>

          {/* Formatted Markdown View */}
          {viewMode === "markdown" && (
            <div className="space-y-4">
              {/* API Symbols */}
              {doc.api_symbols.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    API Signatures
                  </h4>
                  {doc.api_symbols.map((sym, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-[#070a12]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-blue-100 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {sym.symbol_type}
                        </span>
                        <code className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                          {sym.name}
                        </code>
                      </div>
                      <div className="mt-2 overflow-x-auto rounded bg-slate-900 p-2 font-mono text-[11px] text-blue-300 dark:bg-black">
                        {sym.signature}
                      </div>
                      {sym.description && (
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                          {sym.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Sections */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Document Sections
                </h4>
                <div className="space-y-3">
                  {doc.sections.map((sec) => (
                    <div
                      key={sec.id}
                      className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800"
                    >
                      <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        {sec.heading}
                      </h5>
                      <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {sec.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Code Snippets */}
              {doc.code_snippets.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Verified Code Blocks
                  </h4>
                  <div className="space-y-3">
                    {doc.code_snippets.map((snip, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-slate-200 bg-[#070a12] text-slate-100 overflow-hidden dark:border-slate-800"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-3 py-1.5 text-[11px] font-mono text-slate-400">
                          <span>{snip.description || `Snippet #${idx + 1}`}</span>
                          <span className="uppercase">{snip.language}</span>
                        </div>
                        <pre className="p-3 text-xs font-mono overflow-x-auto text-emerald-300">
                          <code>{snip.code}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Raw JSON View */}
          {viewMode === "json" && (
            <div className="relative">
              <button
                onClick={handleCopyJson}
                className="absolute right-3 top-3 flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] font-mono text-slate-300 hover:bg-slate-700 transition"
              >
                {copiedJson ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
              <pre className="max-h-[500px] overflow-auto rounded-xl border border-slate-800 bg-[#070a12] p-4 font-mono text-xs text-blue-300">
                <code>{JSON.stringify(doc, null, 2)}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
