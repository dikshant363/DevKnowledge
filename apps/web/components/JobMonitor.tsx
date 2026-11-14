"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  RotateCcw,
  Terminal,
  FileText,
  ChevronRight,
  ShieldCheck,
  Check,
  Copy,
  X,
  RefreshCw,
  Cpu,
} from "lucide-react";
import { api, CrawlJobRecord } from "@/lib/api";
import { ActiveTab } from "./NavigationShell";

interface JobMonitorProps {
  onNavigate?: (tab: ActiveTab, jobId?: string) => void;
}

export function JobMonitor({ onNavigate }: JobMonitorProps) {
  const [jobs, setJobs] = useState<CrawlJobRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const res = await api.listJobs({
        status: filterStatus === "all" ? undefined : filterStatus,
        limit: 50,
      });
      setJobs(res.items || []);
    } catch (e) {
      console.error("Failed to fetch jobs:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [filterStatus]);

  const PIPELINE_STAGES = [
    { step: 1, name: "DNS Pre-flight & SSRF Check", desc: "Validate target IP is non-private and resolvable" },
    { step: 2, name: "Robots & Sitemap Traversal", desc: "Verify crawl directives and index sitemap tree" },
    { step: 3, name: "Resilient Page Fetch", desc: "HTML retrieval with retry & backoff rate-limiting" },
    { step: 4, name: "AST Snippet & Symbol Parse", desc: "Extract code blocks and API function signatures" },
    { step: 5, name: "CKR Schema Compilation", desc: "Validate canonical JSON schema and SHA-256 hash" },
    { step: 6, name: "Atomic Snapshot Release", desc: "Commit to SQLite cache & publish to MCP agents" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Durable Crawler Job Queue
            </h1>
            <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-mono font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
              Postgres Leased Execution
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Durable background jobs executed on GitHub Actions or authorized runners with exponential backoff and lease renewals.
          </p>
        </div>

        <button
          onClick={fetchJobs}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition astryx-focus"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* 6-Stage Compilation Pipeline Strip */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-[#0c101d] transition-colors">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Universal 6-Stage Knowledge Ingestion Pipeline
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {PIPELINE_STAGES.map((st) => (
            <div
              key={st.step}
              className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 dark:border-slate-800/80 dark:bg-slate-900/50"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-[10px]">
                  {st.step}
                </span>
                <span className="truncate">{st.name}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-tight">
                {st.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Status Filter Buttons */}
      <div className="flex items-center gap-2">
        {["all", "running", "completed", "pending", "failed"].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition astryx-focus ${
              filterStatus === st
                ? "bg-purple-600 text-white font-semibold"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Jobs Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-[#0c101d]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <tr>
                <th className="py-3 px-4">Job ID & Type</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Progress</th>
                <th className="py-3 px-3">Discovered / Processed</th>
                <th className="py-3 px-3">Worker Assigned</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-purple-500 mb-2" />
                    <span>Loading durable jobs from PostgreSQL...</span>
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No crawler jobs matching &ldquo;{filterStatus}&rdquo;.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition"
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {job.job_type}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        ID: {job.id}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      {job.status === "running" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 font-mono">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          Running
                        </span>
                      ) : job.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400 font-mono">
                          <CheckCircle2 className="h-3 w-3" />
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400 font-mono">
                          {job.status}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              job.status === "completed" ? "bg-emerald-500" : "bg-purple-600"
                            }`}
                            style={{ width: `${Math.round(job.progress * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {Math.round(job.progress * 100)}%
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {job.pages_processed} / {job.pages_discovered} pages
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                      {job.worker_id || "Unassigned"}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onNavigate?.("job_details", job.id)}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition astryx-focus"
                      >
                        <FileText className="h-3 w-3" />
                        <span>Logs & Details</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
