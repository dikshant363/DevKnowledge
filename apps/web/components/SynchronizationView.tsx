"use client";

import React, { useState } from "react";
import {
  Clock,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { ActiveTab } from "./NavigationShell";

interface SynchronizationViewProps {
  onManualDispatch?: () => void;
  isDispatching?: boolean;
}

export function SynchronizationView({ onManualDispatch, isDispatching = false }: SynchronizationViewProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleTrigger = () => {
    onManualDispatch?.();
    setFeedback("Cloudflare Worker scheduler triggered: sync dispatch sent to GitHub Actions runner.");
    setTimeout(() => setFeedback(null), 4000);
  };

  const syncPolicies = [
    { source: "Tokio", interval: "Every 6 Hours", mode: "ETag + Sitemap Traversal", nextRun: "In 2 hours 15 mins", status: "Active" },
    { source: "Axum", interval: "Every 6 Hours", mode: "ETag + Sitemap Traversal", nextRun: "In 3 hours 40 mins", status: "Active" },
    { source: "FastAPI", interval: "Every 6 Hours", mode: "PyPI Webhook + ETag", nextRun: "In 1 hour 10 mins", status: "Active" },
    { source: "Kubernetes", interval: "Every 12 Hours", mode: "CNCF Release Sitemap", nextRun: "In 6 hours 20 mins", status: "Active" },
    { source: "React", interval: "Every 6 Hours", mode: "GitHub Release Feed", nextRun: "In 4 hours 05 mins", status: "Active" },
    { source: "PyTorch", interval: "Every 12 Hours", mode: "Weekly Full Crawl", nextRun: "In 8 hours 30 mins", status: "Active" },
  ];

  const recentSyncEvents = [
    { source: "Tokio", type: "content_update", status: "Indexed & Published", time: "1 hour ago", details: "3 updated endpoints" },
    { source: "FastAPI", type: "version_bump", status: "Indexed & Published", time: "3 hours ago", details: "Upgraded 0.110.0 -> 0.111.0" },
    { source: "React", type: "etag_matched", status: "Zero Egress Cache Hit", time: "5 hours ago", details: "HTTP 304 Not Modified" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Continuous Synchronization Engine
            </h1>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-mono font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              Cloudflare Cron Triggered
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Automated change detection via HTTP conditional requests (ETag / If-Modified-Since), sitemaps, and RSS/Atom release feeds.
          </p>
        </div>

        <button
          onClick={handleTrigger}
          disabled={isDispatching}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-amber-700 transition disabled:opacity-50 astryx-focus"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isDispatching ? "animate-spin" : ""}`} />
          <span>{isDispatching ? "Dispatching..." : "Dispatch Sync Trigger"}</span>
        </button>
      </div>

      {feedback && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300">
          {feedback}
        </div>
      )}

      {/* Sync Policies Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-[#0c101d] overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Active Source Sync Schedules & Policies
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
              <tr>
                <th className="py-2.5 px-4">Documentation Source</th>
                <th className="py-2.5 px-3">Interval</th>
                <th className="py-2.5 px-3">Detection Mode</th>
                <th className="py-2.5 px-3">Next Scheduled Sweep</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {syncPolicies.map((p) => (
                <tr key={p.source} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                    {p.source}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {p.interval}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                    {p.mode}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    {p.nextRun}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400 font-mono">
                      <CheckCircle2 className="h-3 w-3" />
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Sync Events Stream */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-[#0c101d]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Recent Synchronization Telemetry Stream
          </h2>
          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
            Zero-Egress Cache Optimization
          </span>
        </div>

        <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/60">
          {recentSyncEvents.map((evt, idx) => (
            <div key={idx} className="flex items-center justify-between py-2.5 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{evt.source}</span>
                  <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                    {evt.type}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{evt.details}</div>
              </div>
              <div className="text-right">
                <span className="inline-block rounded font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                  {evt.status}
                </span>
                <div className="text-[10px] text-slate-400 mt-0.5">{evt.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
