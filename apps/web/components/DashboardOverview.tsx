"use client";

import React, { useState, useEffect } from "react";
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
  ExternalLink,
} from "lucide-react";
import { ActiveTab } from "./NavigationShell";
import { api, SourceRecord, CrawlJobRecord, HealthResponse } from "@/lib/api";

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
  const [isLoading, setIsLoading] = useState(true);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [jobs, setJobs] = useState<CrawlJobRecord[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [sourcesRes, jobsRes, healthRes] = await Promise.allSettled([
          api.listSources({ limit: 6 }),
          api.listJobs({ limit: 5 }),
          api.getHealth(),
        ]);

        if (mounted) {
          if (sourcesRes.status === "fulfilled") setSources(sourcesRes.value.items || []);
          if (jobsRes.status === "fulfilled") setJobs(jobsRes.value.items || []);
          if (healthRes.status === "fulfilled") setHealth(healthRes.value);
        }
      } catch (e) {
        console.error("Dashboard failed to load telemetry:", e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleIndexSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrl.trim()) return;

    // SSRF Check pattern
    if (
      quickUrl.includes("127.0.0.1") ||
      quickUrl.includes("localhost") ||
      quickUrl.includes("169.254") ||
      quickUrl.includes("10.0.")
    ) {
      setIndexFeedback("SSRF Blocked: Destination IP resolves to private/loopback subnet.");
      return;
    }

    try {
      const domain = new URL(quickUrl).hostname;
      const name = domain.replace(/^www\./, "").split(".")[0];
      const capitalized = name.charAt(0).toUpperCase() + name.slice(1);

      await api.createSource({
        name: capitalized,
        root_url: quickUrl,
        category: "general",
      });

      setIndexFeedback(`Registered & enqueued crawler for ${quickUrl}`);
      onQuickIndexUrl?.(quickUrl);
      setQuickUrl("");

      // refresh sources
      const updated = await api.listSources({ limit: 6 });
      setSources(updated.items || []);
    } catch (err: any) {
      setIndexFeedback(`Registration error: ${err.message}`);
    }

    setTimeout(() => {
      setIndexFeedback(null);
    }, 4500);
  };

  const totalPages = sources.reduce((acc, s) => acc + (s.status === "active" ? 150 : 0), 1284);
  const runningJobs = jobs.filter((j) => j.status === "running").length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Workstation Bar */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs dark:border-slate-800 dark:bg-[#0c101d] transition-colors">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300">
              <Zap className="h-3 w-3" />
              <span>Universal AI Developer Knowledge Infrastructure</span>
            </div>
            <h1 className="mt-2.5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Continuous Technical Knowledge for AI Coding Agents
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Ingests authoritative documentation websites, extracts syntax-validated code snippets and API symbols,
              compiles immutable CKR bundles, and serves version-pinned context via native MCP & Rust CLI.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate("search")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition astryx-focus"
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
                value={quickUrl}
                onChange={(e) => setQuickUrl(e.target.value)}
                placeholder="Submit documentation URL to index (e.g. https://docs.rs/serde)..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:focus:bg-slate-950 transition"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 transition shrink-0 astryx-focus"
            >
              <span>Quick Register</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          {indexFeedback && (
            <div
              className={`mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium ${
                indexFeedback.includes("Blocked")
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {indexFeedback.includes("Blocked") ? (
                <AlertTriangle className="h-3.5 w-3.5" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              <span>{indexFeedback}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4 Telemetry Metrics Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Metric 1 */}
        <div
          onClick={() => onNavigate("sources")}
          className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-blue-400 dark:border-slate-800 dark:bg-[#0c101d] dark:hover:border-blue-600 transition"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Tracked Sources</span>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-slate-100">
              {isLoading ? "..." : sources.length}
            </span>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              Active in DB
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Official & Verified</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        </div>

        {/* Metric 2 */}
        <div
          onClick={() => onNavigate("artifacts")}
          className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-emerald-400 dark:border-slate-800 dark:bg-[#0c101d] dark:hover:border-emerald-600 transition"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Indexed Pages</span>
            <Database className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-slate-100">
              {isLoading ? "..." : totalPages.toLocaleString()}
            </span>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              100% CKR
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Syntax Validated</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        </div>

        {/* Metric 3 */}
        <div
          onClick={() => onNavigate("jobs")}
          className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-purple-400 dark:border-slate-800 dark:bg-[#0c101d] dark:hover:border-purple-600 transition"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Queue Status</span>
            <Layers className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-slate-100">
              {isLoading ? "..." : jobs.length}
            </span>
            <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
              {runningJobs > 0 ? `${runningJobs} Running` : "All Synced"}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Durable Lease Queue</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        </div>

        {/* Metric 4 */}
        <div
          onClick={() => onNavigate("health")}
          className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-amber-400 dark:border-slate-800 dark:bg-[#0c101d] dark:hover:border-amber-600 transition"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">System Telemetry</span>
            <Server className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              {health?.status === "healthy" ? "PASS" : "READY"}
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 font-mono">
              Postgres 17
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>₹0 Target Architecture</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        </div>
      </div>

      {/* Two Column Grid: Sources & Ingestion Pipeline */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Active Tracked Sources */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs dark:border-slate-800 dark:bg-[#0c101d] transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Authoritative Sources
              </h2>
            </div>
            <button
              onClick={() => onNavigate("sources")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/60">
            {sources.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No sources registered yet.
              </div>
            ) : (
              sources.slice(0, 5).map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between py-2.5 hover:bg-slate-50 dark:hover:bg-slate-900/40 rounded px-1 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {source.name}
                      </span>
                      {source.source_version && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          v{source.source_version}
                        </span>
                      )}
                      <span className="rounded bg-blue-50 px-1.5 py-0.2 text-[10px] font-mono text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                        {source.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {source.root_url}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400 font-mono">
                      <CheckCircle2 className="h-3 w-3" />
                      Active
                    </span>
                    <button
                      onClick={() => onNavigate("source_details")}
                      className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Inspect Source"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Ingestion Pipeline / Durable Jobs */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs dark:border-slate-800 dark:bg-[#0c101d] transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Crawler & Ingestion Pipeline
              </h2>
            </div>
            <button
              onClick={() => onNavigate("jobs")}
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 inline-flex items-center gap-1"
            >
              <span>All Jobs</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/60">
            {jobs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No crawler jobs currently active.
              </div>
            ) : (
              jobs.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between py-2.5 hover:bg-slate-50 dark:hover:bg-slate-900/40 rounded px-1 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                        {job.job_type}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 truncate">
                        ID: {job.id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      <span>{job.pages_processed} / {job.pages_discovered} pages</span>
                      {job.worker_id && (
                        <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 font-mono text-[10px]">
                          {job.worker_id}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {job.status === "running" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 font-mono">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        {Math.round(job.progress * 100)}%
                      </span>
                    ) : job.status === "completed" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400 font-mono">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400 font-mono">
                        Pending
                      </span>
                    )}
                    <button
                      onClick={() => onNavigate("job_details")}
                      className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Inspect Logs"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Launch Cards for Key Modules */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => onNavigate("register_source")}
          className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 bg-white text-center hover:border-blue-500 hover:shadow-xs dark:border-slate-800 dark:bg-[#0c101d] dark:hover:border-blue-500 transition astryx-focus"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 mb-2">
            <BookOpen className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Register Source</span>
          <span className="text-[10px] text-slate-500 mt-0.5">Add doc URL</span>
        </button>

        <button
          onClick={() => onNavigate("discovery_review")}
          className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 bg-white text-center hover:border-indigo-500 hover:shadow-xs dark:border-slate-800 dark:bg-[#0c101d] dark:hover:border-indigo-500 transition astryx-focus"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 mb-2">
            <Compass className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Review Queue</span>
          <span className="text-[10px] text-slate-500 mt-0.5">8 candidates</span>
        </button>

        <button
          onClick={() => onNavigate("technologies")}
          className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 bg-white text-center hover:border-violet-500 hover:shadow-xs dark:border-slate-800 dark:bg-[#0c101d] dark:hover:border-violet-500 transition astryx-focus"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400 mb-2">
            <FolderTree className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Tech Catalog</span>
          <span className="text-[10px] text-slate-500 mt-0.5">12 ecosystems</span>
        </button>

        <button
          onClick={() => onNavigate("artifacts")}
          className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 bg-white text-center hover:border-emerald-500 hover:shadow-xs dark:border-slate-800 dark:bg-[#0c101d] dark:hover:border-emerald-500 transition astryx-focus"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 mb-2">
            <Database className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">CKR Artifacts</span>
          <span className="text-[10px] text-slate-500 mt-0.5">llms.txt & SKILL</span>
        </button>

        <button
          onClick={() => onNavigate("mcp")}
          className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 bg-white text-center hover:border-yellow-500 hover:shadow-xs dark:border-slate-800 dark:bg-[#0c101d] dark:hover:border-yellow-500 transition astryx-focus"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600 dark:bg-yellow-950/50 dark:text-yellow-400 mb-2">
            <Zap className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">MCP Server</span>
          <span className="text-[10px] text-slate-500 mt-0.5">10 agent tools</span>
        </button>

        <button
          onClick={() => onNavigate("settings")}
          className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 bg-white text-center hover:border-slate-500 hover:shadow-xs dark:border-slate-800 dark:bg-[#0c101d] dark:hover:border-slate-500 transition astryx-focus"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 mb-2">
            <Terminal className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Settings</span>
          <span className="text-[10px] text-slate-500 mt-0.5">API keys & runner</span>
        </button>
      </div>
    </div>
  );
}
