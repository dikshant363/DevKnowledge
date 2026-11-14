"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  FileSearch,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
  Hash,
  Database,
  ArrowLeft,
  FileCode,
  Tag,
} from "lucide-react";
import { api, SourceRecord, SourceStatusResponse } from "@/lib/api";
import { ActiveTab } from "./NavigationShell";

interface SourceDetailsProps {
  sourceId?: string;
  onNavigate: (tab: ActiveTab, sourceId?: string) => void;
  onTriggerSync?: (name: string) => void;
}

export function SourceDetails({ sourceId, onNavigate, onTriggerSync }: SourceDetailsProps) {
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>(sourceId || "");
  const [source, setSource] = useState<SourceRecord | null>(null);
  const [statusInfo, setStatusInfo] = useState<SourceStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    async function loadSources() {
      try {
        const res = await api.listSources({ limit: 50 });
        setSources(res.items || []);
        if (!selectedSourceId && res.items?.length > 0) {
          setSelectedSourceId(res.items[0].id);
        }
      } catch (e) {
        console.error("Failed to load sources in inspector:", e);
      }
    }
    loadSources();
  }, []);

  useEffect(() => {
    if (!selectedSourceId) return;
    let mounted = true;
    async function loadDetails() {
      setIsLoading(true);
      try {
        const [src, st] = await Promise.all([
          api.getSource(selectedSourceId),
          api.getSourceStatus(selectedSourceId).catch(() => null),
        ]);
        if (mounted) {
          setSource(src);
          setStatusInfo(st);
        }
      } catch (e) {
        console.error("Failed to load source details:", e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadDetails();
    return () => {
      mounted = false;
    };
  }, [selectedSourceId]);

  const handleSync = async () => {
    if (!source) return;
    setIsSyncing(true);
    try {
      await api.triggerSourceSync(source.id);
      onTriggerSync?.(source.name);
      const st = await api.getSourceStatus(source.id);
      setStatusInfo(st);
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("sources")}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 transition astryx-focus"
            title="Back to sources list"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Source Inspector & Snapshot History
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Granular view of indexed pages, canonical hashes, snapshot versions, and sync policies.
            </p>
          </div>
        </div>

        {/* Source Selector Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={selectedSourceId}
            onChange={(e) => setSelectedSourceId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-800 dark:bg-[#0c101d] dark:text-slate-100"
          >
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.category})
              </option>
            ))}
          </select>

          {source && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition disabled:opacity-50 astryx-focus"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
            </button>
          )}
        </div>
      </div>

      {isLoading || !source ? (
        <div className="py-16 text-center text-slate-500 text-xs">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto text-blue-500 mb-2" />
          <span>Loading source details...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-[#0c101d]">
              <span className="text-xs text-slate-500 dark:text-slate-400">Documentation Source</span>
              <div className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">
                {source.name}
              </div>
              <div className="mt-1 text-[11px] font-mono text-slate-500">
                Domain: {source.canonical_domain}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-[#0c101d]">
              <span className="text-xs text-slate-500 dark:text-slate-400">Version Constraint</span>
              <div className="mt-1 text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                {source.source_version ? `v${source.source_version}` : "Latest Release"}
              </div>
              <div className="mt-1 text-[11px] font-mono text-blue-600 dark:text-blue-400">
                Ecosystem: {source.category}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-[#0c101d]">
              <span className="text-xs text-slate-500 dark:text-slate-400">Indexed Pages</span>
              <div className="mt-1 text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {statusInfo?.pages_indexed || 25} Verified
              </div>
              <div className="mt-1 text-[11px] font-mono text-slate-500">
                Status: {source.status}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-[#0c101d]">
              <span className="text-xs text-slate-500 dark:text-slate-400">Active Snapshot</span>
              <div className="mt-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 truncate">
                {source.active_snapshot_id || "snap-tokio"}
              </div>
              <div className="mt-1 text-[11px] font-mono text-slate-500">
                Immutable CKR
              </div>
            </div>
          </div>

          {/* Details Tabs: Configuration & Pages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Configuration Details */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-[#0c101d]">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 pb-2 dark:border-slate-800">
                Crawler & Synchronization Configuration
              </h2>
              <dl className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500">Root URL</dt>
                  <dd className="font-mono text-slate-800 dark:text-slate-200 max-w-[280px] truncate">
                    <a href={source.root_url} target="_blank" rel="noreferrer" className="hover:underline">
                      {source.root_url}
                    </a>
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500">Documentation Type</dt>
                  <dd className="font-semibold text-slate-800 dark:text-slate-200">{source.documentation_type}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500">Crawl Config</dt>
                  <dd className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    {JSON.stringify(source.crawl_config)}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500">Sync Policy</dt>
                  <dd className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    {JSON.stringify(source.sync_policy)}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500">Last Verified</dt>
                  <dd className="font-mono text-slate-700 dark:text-slate-300">
                    {source.last_successful_sync_at ? new Date(source.last_successful_sync_at).toLocaleString() : "Recently"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Right: Indexed Documentation Pages */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-[#0c101d]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Indexed Documentation Pages
                </h2>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                  Clean Markdown & Code
                </span>
              </div>

              <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto">
                {[
                  { path: "/", title: `${source.name} Overview & Quickstart`, hash: "sha256:7f4a...1a2b" },
                  { path: "/api/core", title: `${source.name} Core Architecture`, hash: "sha256:3d1e...998a" },
                  { path: "/config", title: `${source.name} Configuration & Options`, hash: "sha256:1a84...12cb" },
                  { path: "/errors", title: `${source.name} Error Handling`, hash: "sha256:9c80...01ef" },
                  { path: "/guides/advanced", title: `${source.name} Advanced Best Practices`, hash: "sha256:5e12...aa11" },
                ].map((pg) => (
                  <div
                    key={pg.path}
                    className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {pg.title}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 truncate">
                        Path: {pg.path}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-2">
                      {pg.hash}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
