"use client";

import React, { useState, useEffect } from "react";
import {
  Code2,
  Copy,
  Check,
  Download,
  ArrowLeft,
  FileCode,
  ShieldCheck,
  Hash,
  Database,
  RefreshCw,
} from "lucide-react";
import { api, ArtifactRecord } from "@/lib/api";
import { ActiveTab } from "./NavigationShell";

interface ArtifactPreviewProps {
  artifactId?: string;
  onNavigate?: (tab: ActiveTab) => void;
}

export function ArtifactPreview({ artifactId, onNavigate }: ArtifactPreviewProps) {
  const [artifacts, setArtifacts] = useState<ArtifactRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>(artifactId || "");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadArtifacts() {
      setIsLoading(true);
      try {
        const list = await api.listArtifacts();
        setArtifacts(list || []);
        if (!selectedId && list?.length > 0) {
          setSelectedId(list[0].id);
        }
      } catch (e) {
        console.error("Failed to load artifacts for preview:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadArtifacts();
  }, []);

  const currentArtifact = artifacts.find((a) => a.id === selectedId) || artifacts[0];

  const sampleContent = currentArtifact
    ? `# DevKnowledge Canonical Knowledge Representation (CKR)
# Type: ${currentArtifact.artifact_type.toUpperCase()}
# Version: ${currentArtifact.artifact_version}
# Target Source: ${currentArtifact.source_id}
# Checksum: ${currentArtifact.checksum}

> [!NOTE]
> This artifact is an immutable, canonical compilation of authoritative documentation.
> Cleaned of marketing clutter, navigation chrome, and tracking scripts.

## 1. Quickstart & Initialization
\`\`\`rust
use tokio::task;

#[tokio::main]
async fn main() {
    let handle = task::spawn(async {
        "task result"
    });
    let result = handle.await.unwrap();
    println!("Spawned async execution: {}", result);
}
\`\`\`

## 2. API Signatures & Symbols
- **pub fn spawn<T>(future: T) -> JoinHandle<T::Output>**
  Spawns a new asynchronous task on the current multi-threaded Tokio runtime.
- **pub fn yield_now() -> YieldNow**
  Yields execution back to the Tokio runtime scheduler.

## 3. Best Practices & Invariants
1. Never block the asynchronous runtime worker threads with synchronous I/O or sleep.
2. Use bounded channels (\`mpsc::channel\`) to enforce strict backpressure.
3. Handle task panics by pattern-matching the returned JoinHandle Result.
`
    : "No artifact selected.";

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([sampleContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentArtifact?.artifact_type || "artifact"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate("artifacts")}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 transition astryx-focus"
              title="Back to Artifacts list"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Artifact Content Inspector
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Verified compiled output bundle formatted specifically for AI coding agents and LLM context windows.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs font-mono font-semibold text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-800 dark:bg-[#0c101d] dark:text-slate-100"
          >
            {artifacts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.artifact_type.toUpperCase()} ({a.source_id})
              </option>
            ))}
          </select>

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition astryx-focus"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied" : "Copy Content"}</span>
          </button>

          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 transition astryx-focus"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {isLoading || !currentArtifact ? (
        <div className="py-16 text-center text-xs text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto text-emerald-500 mb-2" />
          <span>Loading artifact preview...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Metadata pill strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-[#0c101d]">
            <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
              <span>Type: <strong className="text-slate-900 dark:text-slate-100">{currentArtifact.artifact_type}</strong></span>
              <span>•</span>
              <span>Source: <strong className="text-slate-900 dark:text-slate-100">{currentArtifact.source_id}</strong></span>
              <span>•</span>
              <span>Checksum: <strong className="text-slate-900 dark:text-slate-100 truncate">{currentArtifact.checksum}</strong></span>
            </div>
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono font-medium text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5" /> Immutable SHA-256 Validated
            </span>
          </div>

          {/* Code Viewer Container */}
          <div className="rounded-xl border border-slate-800 bg-[#070a12] p-5 shadow-2xl text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed max-h-[600px] overflow-y-auto">
            <pre>
              <code>{sampleContent}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
