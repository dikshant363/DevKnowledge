"use client";

import React, { useState } from "react";
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

export interface PipelineJob {
  id: string;
  source: string;
  version: string;
  trigger_type: "cron_schedule" | "manual_dispatch" | "autonomous_discovery";
  current_stage: number; // 1 to 6
  status: "running" | "completed" | "failed";
  records_extracted: number;
  duration_sec: number;
  started_at: string;
  snapshot_hash?: string;
  logs: string[];
}

const PIPELINE_STAGES = [
  { step: 1, name: "DNS Pre-flight & SSRF Check", desc: "Validate target IP is non-private and resolvable" },
  { step: 2, name: "Robots & Sitemap Traversal", desc: "Verify crawl directives and index sitemap tree" },
  { step: 3, name: "Resilient Page Fetch", desc: "HTML retrieval with retry & backoff rate-limiting" },
  { step: 4, name: "AST Snippet & Symbol Parse", desc: "Extract code blocks and API function signatures" },
  { step: 5, name: "CKR Schema Compilation", desc: "Validate canonical JSON schema and SHA-256 hash" },
  { step: 6, name: "Atomic Snapshot Release", desc: "Commit to SQLite cache & publish to MCP agents" },
];

const INITIAL_JOBS: PipelineJob[] = [
  {
    id: "job-881",
    source: "Tokio",
    version: "1.38.0",
    trigger_type: "manual_dispatch",
    current_stage: 6,
    status: "completed",
    records_extracted: 284,
    duration_sec: 14.2,
    started_at: "8 mins ago",
    snapshot_hash: "sha256:7f4a2b91c8e3",
    logs: [
      "[INFO] 19:04:11 [DNS Pre-flight] Resolving docs.rs -> 151.101.65.140 (Public ASN verified).",
      "[INFO] 19:04:12 [SSRF Safe] Target passes non-routable private IP subnet check.",
      "[INFO] 19:04:13 [Robots.txt] Fetched docs.rs/robots.txt - Status 200 OK. Crawl-delay: 1.0s.",
      "[INFO] 19:04:15 [Sitemap] Found 284 endpoints matching tokio/*.",
      "[INFO] 19:04:21 [Extractor] Extracted 812 syntax-validated code snippets and 410 API symbols.",
      "[INFO] 19:04:24 [Compiler] Compiled CKR artifact: sha256:7f4a2b91c8e3 (1.2 MB compressed).",
      "[PASS] 19:04:25 [Release] Snapshot committed to devknowledge.db and Supabase storage bucket.",
    ],
  },
  {
    id: "job-880",
    source: "Kubernetes",
    version: "1.30.0",
    trigger_type: "cron_schedule",
    current_stage: 6,
    status: "completed",
    records_extracted: 420,
    duration_sec: 22.8,
    started_at: "34 mins ago",
    snapshot_hash: "sha256:9c801ba901ef",
    logs: [
      "[INFO] 18:38:00 [Cron Trigger] Cloudflare Worker scheduled task dispatched.",
      "[INFO] 18:38:02 [SSRF Safe] kubernetes.io validated (Non-internal IP).",
      "[INFO] 18:38:14 [Parser] Ingested core API documentation structure.",
      "[INFO] 18:38:20 [Compiler] Generated canonical schema with 420 documents.",
      "[PASS] 18:38:22 [Release] Snapshot sha256:9c801ba901ef published successfully.",
    ],
  },
  {
    id: "job-879",
    source: "Axum",
    version: "0.7.5",
    trigger_type: "autonomous_discovery",
    current_stage: 6,
    status: "completed",
    records_extracted: 142,
    duration_sec: 8.6,
    started_at: "1 hour ago",
    snapshot_hash: "sha256:3d1e998a442b",
    logs: [
      "[INFO] 18:02:10 [Autonomous] Auto-registered candidate Axum after confidence score 0.94.",
      "[INFO] 18:02:12 [Crawler] Scraped docs.rs/axum/latest/axum/.",
      "[PASS] 18:02:18 [Release] CKR bundle published to local and edge registries.",
    ],
  },
];

export function JobMonitor() {
  const [jobs, setJobs] = useState<PipelineJob[]>(INITIAL_JOBS);
  const [selectedJob, setSelectedJob] = useState<PipelineJob>(INITIAL_JOBS[0]);
  const [copiedLog, setCopiedLog] = useState(false);

  const handleSimulateNewJob = () => {
    const newJobId = `job-${Math.floor(882 + Math.random() * 50)}`;
    const newJob: PipelineJob = {
      id: newJobId,
      source: "FastAPI",
      version: "0.111.0",
      trigger_type: "manual_dispatch",
      current_stage: 2,
      status: "running",
      records_extracted: 94,
      duration_sec: 3.4,
      started_at: "Just now",
      logs: [
        `[INFO] Ingestion job ${newJobId} started for FastAPI v0.111.0`,
        `[INFO] [DNS Pre-flight] fastapi.tiangolo.com IP verified public and responsive.`,
        `[INFO] [Robots] Checking /sitemap.xml traversal tree...`,
      ],
    };

    setJobs((prev) => [newJob, ...prev]);
    setSelectedJob(newJob);

    // Progress through stages
    setTimeout(() => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === newJobId
            ? {
                ...j,
                current_stage: 4,
                logs: [
                  ...j.logs,
                  "[INFO] Extracted 198 endpoints and verified OpenAPI symbols.",
                ],
              }
            : j
        )
      );
    }, 1500);

    setTimeout(() => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === newJobId
            ? {
                ...j,
                current_stage: 6,
                status: "completed",
                records_extracted: 198,
                duration_sec: 6.8,
                snapshot_hash: "sha256:1a84f50912cb",
                logs: [
                  ...j.logs,
                  "[PASS] CKR compilation complete: sha256:1a84f50912cb.",
                  "[PASS] Snapshot released to local SQLite cache & MCP runtime.",
                ],
              }
            : j
        )
      );
    }, 3200);
  };

  const handleCopyLogs = () => {
    if (!selectedJob) return;
    navigator.clipboard?.writeText(selectedJob.logs.join("\n"));
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-[#0f172a]">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Ingestion & Compilation Job Monitor
            </h2>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              100% Success Rate
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Real-time pipeline monitoring across DNS pre-flight, extraction, CKR compilation, and atomic release.
          </p>
        </div>

        <button
          onClick={handleSimulateNewJob}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 transition shrink-0 astryx-focus"
        >
          <Play className="h-3.5 w-3.5" />
          <span>Enqueue Test Job</span>
        </button>
      </div>

      {/* 6-Stage Execution Pipeline Visualizer for Selected Job */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
              {selectedJob.id}
            </span>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {selectedJob.source} ({selectedJob.version})
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
            <span>Trigger: {selectedJob.trigger_type}</span>
            <span>•</span>
            <span>Duration: {selectedJob.duration_sec}s</span>
          </div>
        </div>

        {/* Stage Timeline Steps */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {PIPELINE_STAGES.map((st) => {
            const isCompleted = selectedJob.current_stage >= st.step && selectedJob.status !== "failed";
            const isCurrent = selectedJob.current_stage === st.step && selectedJob.status === "running";

            return (
              <div
                key={st.step}
                className={`rounded-lg border p-2.5 text-xs transition ${
                  isCurrent
                    ? "border-blue-400 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/40"
                    : isCompleted
                    ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20"
                    : "border-slate-200 bg-slate-50/40 opacity-60 dark:border-slate-800 dark:bg-slate-900/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-400">Stage {st.step}</span>
                  {isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : isCurrent ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </div>
                <div className="mt-1 font-semibold text-[11px] text-slate-800 dark:text-slate-200 line-clamp-1">
                  {st.name}
                </div>
                <p className="mt-0.5 text-[9px] text-slate-500 line-clamp-2">{st.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Jobs Table & Terminal Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Jobs Table (7 Cols) */}
        <div className="lg:col-span-7 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-[#0f172a]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="p-3">Job ID & Target</th>
                <th className="p-3">Trigger</th>
                <th className="p-3">Stage & Docs</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">View Logs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {jobs.map((job) => {
                const isSelected = selectedJob.id === job.id;
                return (
                  <tr
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-purple-50/60 dark:bg-purple-950/30"
                        : "hover:bg-slate-50/60 dark:hover:bg-slate-850/40"
                    }`}
                  >
                    <td className="p-3">
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {job.id}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {job.source} v{job.version}
                      </div>
                    </td>

                    <td className="p-3">
                      <span className="rounded bg-slate-100 px-1.5 py-0.2 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {job.trigger_type.replace("_", " ")}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">{job.started_at}</div>
                    </td>

                    <td className="p-3">
                      <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        Stage {job.current_stage} / 6
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {job.records_extracted} docs compiled
                      </div>
                    </td>

                    <td className="p-3">
                      {job.status === "completed" && (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Pass
                        </span>
                      )}
                      {job.status === "running" && (
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Ingesting
                        </span>
                      )}
                      {job.status === "failed" && (
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="h-3.5 w-3.5" /> Failed
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-right">
                      <span
                        className={`text-xs font-semibold ${
                          isSelected
                            ? "text-purple-600 dark:text-purple-400"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        Inspect &rarr;
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right Column: Terminal Worker Logs (5 Cols) */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-[#070a12] text-slate-200 p-4 shadow-2xs dark:border-slate-800 flex flex-col h-[400px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-purple-400" />
              <span className="font-mono text-xs font-bold text-slate-200">
                Worker Stdout — {selectedJob.id}
              </span>
            </div>
            <button
              onClick={handleCopyLogs}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition"
              aria-label="Copy terminal logs"
            >
              {copiedLog ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1.5 text-slate-300">
            {selectedJob.logs.map((line, idx) => {
              const isPass = line.includes("[PASS]");
              const isInfo = line.includes("[INFO]");
              const isSafe = line.includes("[SSRF Safe]");

              return (
                <div
                  key={idx}
                  className={`${
                    isPass
                      ? "text-emerald-400 font-semibold"
                      : isSafe
                      ? "text-sky-400"
                      : isInfo
                      ? "text-slate-300"
                      : "text-slate-400"
                  }`}
                >
                  {line}
                </div>
              );
            })}
          </div>

          {selectedJob.snapshot_hash && (
            <div className="mt-2 border-t border-slate-800/80 pt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Published Artifact:</span>
              <span className="text-purple-400">{selectedJob.snapshot_hash}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
