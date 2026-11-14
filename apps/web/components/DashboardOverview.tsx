"use client";

import React, { useState } from "react";
import {
  Activity,
  BookOpen,
  Compass,
  Layers,
  Database,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Server,
  Zap,
  Globe,
  Clock,
  Terminal,
  Cpu,
  RefreshCw,
  FolderTree,
  ChevronRight,
} from "lucide-react";
import { ActiveTab } from "./NavigationShell";

interface DashboardOverviewProps {
  onNavigate: (tab: ActiveTab) => void;
  onOpenCommandPalette: () => void;
  onQuickIndexUrl?: (url: string) => void;
}

export function DashboardOverview({
  onNavigate,
  onOpenCommandPalette,
  onQuickIndexUrl,
}: DashboardOverviewProps) {
  const [quickUrl, setQuickUrl] = useState("");
  const [indexFeedback, setIndexFeedback] = useState<string | null>(null);

  const handleIndexSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrl.trim()) return;

    // Simulate pre-flight SSRF and indexing feedback
    if (quickUrl.includes("127.0.0.1") || quickUrl.includes("localhost") || quickUrl.includes("169.254")) {
      setIndexFeedback("SSRF Blocked: Destination IP resolves to private/loopback subnet.");
      return;
    }

    setIndexFeedback(`SSRF Validated: Ingestion pipeline queued for ${quickUrl}`);
    onQuickIndexUrl?.(quickUrl);
    setTimeout(() => {
      setIndexFeedback(null);
      setQuickUrl("");
    }, 3500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Workstation Bar */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-[#0f172a] transition-colors">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300">
              <Zap className="h-3 w-3" />
              <span>High-Density Documentation Intelligence Workstation</span>
            </div>
            <h1 className="mt-2.5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Continuous Technical Knowledge for AI Agents
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Ingests authoritative documentation websites, extracts syntax-validated code snippets and API symbols,
              compiles immutable CKR bundles, and serves version-pinned context via native MCP & Rust CLI.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate("search")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition astryx-focus"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Query Knowledge</span>
            </button>
            <button
              onClick={onOpenCommandPalette}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 transition astryx-focus"
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Command Hub (⌘K)</span>
            </button>
          </div>
        </div>

        {/* Quick URL Ingestion Strip */}
        <div className="mt-5 border-t border-slate-200/80 pt-4 dark:border-slate-800">
          <form onSubmit={handleIndexSubmit} className="flex flex-col sm:flex-row gap-2 max-w-2xl">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Globe className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="url"
                required
                placeholder="Enter doc URL (e.g., https://docs.rs/axum, https://kubernetes.io/docs/)..."
                value={quickUrl}
                onChange={(e) => setQuickUrl(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100 astryx-focus"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 transition shrink-0 astryx-focus"
            >
              <span>Validate & Index</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          {indexFeedback && (
            <div
              role="status"
              aria-live="polite"
              className={`mt-2.5 rounded-lg p-2.5 text-xs font-mono flex items-center gap-2 ${
                indexFeedback.includes("Blocked")
                  ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900"
              }`}
            >
              {indexFeedback.includes("Blocked") ? (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              )}
              <span>{indexFeedback}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4-Up High-Density Metrics Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <div
          onClick={() => onNavigate("sources")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-blue-400 hover:shadow-xs dark:border-slate-800 dark:bg-[#0f172a] dark:hover:border-slate-700 transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Tracked Sources</span>
            <BookOpen className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">8</span>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">100% verified</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 dark:border-slate-800/80">
            <span>Rust, Python, Apple, Android</span>
            <ChevronRight className="h-3 w-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Metric 2 */}
        <div
          onClick={() => onNavigate("artifacts")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-emerald-400 hover:shadow-xs dark:border-slate-800 dark:bg-[#0f172a] dark:hover:border-slate-700 transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Indexed Knowledge</span>
            <Database className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">1,420</span>
            <span className="text-[11px] font-medium text-slate-500">docs</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 dark:border-slate-800/80">
            <span>4.8k code blocks • 2.1k symbols</span>
            <ChevronRight className="h-3 w-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Metric 3 */}
        <div
          onClick={() => onNavigate("jobs")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-purple-400 hover:shadow-xs dark:border-slate-800 dark:bg-[#0f172a] dark:hover:border-slate-700 transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Pipeline Jobs</span>
            <Layers className="h-4 w-4 text-slate-400 group-hover:text-purple-500 transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">14 / 14</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> 100% pass
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 dark:border-slate-800/80">
            <span>0 failed • 0 quarantined</span>
            <ChevronRight className="h-3 w-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-[#0f172a] transition">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Gateway & MCP Throughput</span>
            <Activity className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">18 ms</span>
            <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">avg latency</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 dark:border-slate-800/80">
            <span>Rate limit: 120 req/min</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">₹0/mo active</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Architecture Health & Activity Telemetry */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Subsystem Status Matrix */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Infrastructure & Engine Health Matrix
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">Status: All Systems Operational</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Card 1: Cloudflare Gateway */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0f172a]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900 dark:text-slate-100">
                    <Server className="h-4 w-4 text-blue-500" />
                    <span>Cloudflare Worker Gateway</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Edge routing, cron-trigger automation, free-tier rate limits.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  HEALTHY
                </span>
              </div>
              <div className="mt-3 space-y-1 text-[11px] font-mono text-slate-600 dark:text-slate-400 border-t border-slate-100 pt-2 dark:border-slate-800">
                <div className="flex justify-between">
                  <span>Max CPU Budget:</span>
                  <span className="text-slate-900 dark:text-slate-200">50 ms / req</span>
                </div>
                <div className="flex justify-between">
                  <span>Cron Schedule:</span>
                  <span className="text-slate-900 dark:text-slate-200">Every 15 mins</span>
                </div>
              </div>
            </div>

            {/* Card 2: Supabase PostgreSQL */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0f172a]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900 dark:text-slate-100">
                    <Database className="h-4 w-4 text-emerald-500" />
                    <span>Supabase Postgres + Vector</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Relational catalog, canonical docs & pgvector embeddings.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  CONNECTED
                </span>
              </div>
              <div className="mt-3 space-y-1 text-[11px] font-mono text-slate-600 dark:text-slate-400 border-t border-slate-100 pt-2 dark:border-slate-800">
                <div className="flex justify-between">
                  <span>Connection Pool:</span>
                  <span className="text-slate-900 dark:text-slate-200">Session Mode (:5432)</span>
                </div>
                <div className="flex justify-between">
                  <span>Storage Bucket:</span>
                  <span className="text-slate-900 dark:text-slate-200">devknowledge-ckr</span>
                </div>
              </div>
            </div>

            {/* Card 3: Rust Workspace & Native CLI */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0f172a]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900 dark:text-slate-100">
                    <Cpu className="h-4 w-4 text-purple-500" />
                    <span>Native Rust Workspace</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    crates/core, cache, runtime, parser, and native devknowledge CLI.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  COMPILED
                </span>
              </div>
              <div className="mt-3 space-y-1 text-[11px] font-mono text-slate-600 dark:text-slate-400 border-t border-slate-100 pt-2 dark:border-slate-800">
                <div className="flex justify-between">
                  <span>Offline SQLite DB:</span>
                  <span className="text-slate-900 dark:text-slate-200">devknowledge.db (Active)</span>
                </div>
                <div className="flex justify-between">
                  <span>Test Verification:</span>
                  <span className="text-slate-900 dark:text-slate-200">cargo test passing</span>
                </div>
              </div>
            </div>

            {/* Card 4: Model Context Protocol (MCP) Server */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0f172a]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900 dark:text-slate-100">
                    <Terminal className="h-4 w-4 text-amber-500" />
                    <span>TypeScript MCP Server</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Direct integration for Claude Code, Cursor, Windsurf & Antigravity.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  READY
                </span>
              </div>
              <div className="mt-3 space-y-1 text-[11px] font-mono text-slate-600 dark:text-slate-400 border-t border-slate-100 pt-2 dark:border-slate-800">
                <div className="flex justify-between">
                  <span>Transport:</span>
                  <span className="text-slate-900 dark:text-slate-200">stdio JSON-RPC 2.0</span>
                </div>
                <div className="flex justify-between">
                  <span>Active MCP Tools:</span>
                  <span className="text-slate-900 dark:text-slate-200">5 published</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Live Activity Stream */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Live Activity Stream
            </h2>
            <button
              onClick={() => onNavigate("jobs")}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
            >
              View All Jobs &rarr;
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#0f172a] space-y-3">
            {[
              {
                time: "2 mins ago",
                title: "Tokio Snapshot Released",
                sub: "CKR bundle hash sha256:4a8b... compiled with 284 sections",
                tech: "Tokio",
                status: "success",
              },
              {
                time: "14 mins ago",
                title: "SSRF Pre-flight Verified",
                sub: "Checked 6 candidate URLs against private IP subnet ranges",
                tech: "Discovery",
                status: "info",
              },
              {
                time: "32 mins ago",
                title: "Kubernetes Docs Synced",
                sub: "v1.30.0 release notes and core API symbols updated",
                tech: "K8s",
                status: "success",
              },
              {
                time: "1 hour ago",
                title: "FastAPI ETag Unchanged",
                sub: "304 Not Modified detected, zero egress bandwidth spent",
                tech: "FastAPI",
                status: "idle",
              },
            ].map((ev, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs pb-2 border-b border-slate-100 last:border-0 last:pb-0 dark:border-slate-800/80">
                <div className="mt-0.5">
                  {ev.status === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                  {ev.status === "info" && <Compass className="h-3.5 w-3.5 text-blue-500" />}
                  {ev.status === "idle" && <Clock className="h-3.5 w-3.5 text-slate-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {ev.title}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">{ev.time}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {ev.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
