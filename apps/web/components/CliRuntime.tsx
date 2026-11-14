"use client";

import React, { useState } from "react";
import {
  Terminal,
  Database,
  ShieldCheck,
  Copy,
  Check,
  Download,
  Cpu,
  Layers,
  ArrowRight,
} from "lucide-react";
import { ActiveTab } from "./NavigationShell";

interface CliRuntimeProps {
  onNavigate?: (tab: ActiveTab) => void;
}

export function CliRuntime({ onNavigate }: CliRuntimeProps) {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const commands = [
    { cmd: "cargo install --path crates/cli", desc: "Build & install the native Rust CLI binary" },
    { cmd: "devknowledge search 'tokio spawn' --ecosystem rust", desc: "Fast sub-millisecond offline FTS5 search in SQLite" },
    { cmd: "devknowledge sync --source tokio", desc: "Sync latest canonical documentation snapshot to local cache" },
    { cmd: "devknowledge export --source tokio --format llms-txt", desc: "Export compiled llms.txt to current directory" },
    { cmd: "devknowledge mcp --stdio", desc: "Run high-throughput native stdio MCP server for agents" },
    { cmd: "devknowledge cache stats", desc: "Inspect local SQLite cache size, WAL status and entry counts" },
  ];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-slate-500" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Rust CLI & Offline Local Runtime
          </h1>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-mono font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            v1.0.0 Cargo Workspace
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Native high-performance CLI written in Rust with embedded SQLite FTS5 full-text search, WAL mode, and zero-egress offline operation.
        </p>
      </div>

      {/* Local Cache Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-[#0c101d]">
          <span className="text-xs text-slate-500">Local Cache Database</span>
          <div className="mt-1 text-base font-bold font-mono text-slate-900 dark:text-slate-100">
            SQLite FTS5 (WAL)
          </div>
          <div className="mt-1 text-[11px] font-mono text-slate-400">
            ~/.devknowledge/cache.db
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-[#0c101d]">
          <span className="text-xs text-slate-500">Search Throughput</span>
          <div className="mt-1 text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
            &lt; 0.8 ms / Query
          </div>
          <div className="mt-1 text-[11px] font-mono text-slate-400">
            Sanitized Token Matching
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-[#0c101d]">
          <span className="text-xs text-slate-500">Offline Portability</span>
          <div className="mt-1 text-base font-bold font-mono text-blue-600 dark:text-blue-400">
            Zero Cloud Egress
          </div>
          <div className="mt-1 text-[11px] font-mono text-slate-400">
            Airplane & Air-gapped Ready
          </div>
        </div>
      </div>

      {/* CLI Command Reference */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-[#0c101d] overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Essential CLI Commands
          </h2>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {commands.map((c, idx) => (
            <div key={idx} className="p-3.5 flex items-center justify-between gap-4 text-xs hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded text-[11px]">
                    $ {c.cmd}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  {c.desc}
                </p>
              </div>

              <button
                onClick={() => handleCopy(`cmd-${idx}`, c.cmd)}
                className="shrink-0 inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition astryx-focus"
              >
                {copiedCmd === `cmd-${idx}` ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    <span className="text-emerald-500">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
