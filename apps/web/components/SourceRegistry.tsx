"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Search,
  Plus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  FileCode,
  Tag,
  Hash,
  AlertCircle,
  Copy,
  Check,
  Trash2,
  Filter,
} from "lucide-react";
import { api, SourceRecord } from "@/lib/api";
import { ActiveTab } from "./NavigationShell";

interface SourceRegistryProps {
  onTriggerSync?: (name: string) => void;
  onNavigate?: (tab: ActiveTab, sourceId?: string) => void;
}

export function SourceRegistry({ onTriggerSync, onNavigate }: SourceRegistryProps) {
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchSources = async () => {
    setIsLoading(true);
    try {
      const res = await api.listSources({
        category: selectedCategory === "all" ? undefined : selectedCategory,
        q: searchQuery || undefined,
        limit: 50,
      });
      setSources(res.items || []);
    } catch (e) {
      console.error("Failed to fetch sources:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, [selectedCategory, searchQuery]);

  const handleSync = async (source: SourceRecord) => {
    setSyncingId(source.id);
    try {
      await api.triggerSourceSync(source.id);
      onTriggerSync?.(source.name);
      await fetchSources();
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (sourceId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete source '${name}'?`)) return;
    try {
      await api.deleteSource(sourceId);
      await fetchSources();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const categories = [
    { id: "all", label: "All Ecosystems" },
    { id: "rust", label: "Rust" },
    { id: "python", label: "Python" },
    { id: "javascript", label: "JavaScript / TS" },
    { id: "cloud", label: "Cloud & DevOps" },
    { id: "android", label: "Android" },
    { id: "apple", label: "Apple / Swift" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Documentation Source Registry
            </h1>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-mono font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              {sources.length} Tracked
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Authoritative documentation origins with continuous ETag & sitemap change detection, SSRF boundaries, and CKR compilation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate?.("register_source")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition astryx-focus"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Register Source</span>
          </button>
          <button
            onClick={fetchSources}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition astryx-focus"
            title="Refresh Registry"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter sources by name or domain..."
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden dark:border-slate-800 dark:bg-[#0c101d] dark:text-slate-100"
          />
        </div>

        {/* Ecosystem Pills */}
        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition astryx-focus ${
                selectedCategory === cat.id
                  ? "bg-slate-900 text-white dark:bg-blue-600 font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* High-Density Data Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-[#0c101d] transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <tr>
                <th className="py-3 px-4">Documentation Source</th>
                <th className="py-3 px-3">Ecosystem</th>
                <th className="py-3 px-3">Version Pin</th>
                <th className="py-3 px-3">Canonical Root URL</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-blue-500 mb-2" />
                    <span>Loading authoritative documentation sources from PostgreSQL...</span>
                  </td>
                </tr>
              ) : sources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No documentation sources matched your filter. Click &ldquo;Register Source&rdquo; to add one.
                  </td>
                </tr>
              ) : (
                sources.map((source) => {
                  const isSyncing = syncingId === source.id;
                  return (
                    <tr
                      key={source.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onNavigate?.("source_details", source.id)}
                            className="font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 text-left"
                          >
                            {source.name}
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          ID: {source.id.slice(0, 8)}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {source.category}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px]">
                        {source.source_version ? (
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            v{source.source_version}
                          </span>
                        ) : (
                          <span className="text-slate-400">latest</span>
                        )}
                      </td>

                      <td className="py-3 px-3 max-w-[280px]">
                        <div className="flex items-center gap-1.5 truncate">
                          <a
                            href={source.root_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 truncate font-mono text-[11px]"
                          >
                            {source.root_url}
                          </a>
                          <button
                            onClick={() => handleCopy(source.id, source.root_url)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Copy URL"
                          >
                            {copiedId === source.id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Domain: {source.canonical_domain}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400 font-mono">
                          <CheckCircle2 className="h-3 w-3" />
                          {source.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSync(source)}
                            disabled={isSyncing}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition disabled:opacity-50 astryx-focus"
                            title="Trigger Incremental Crawl"
                          >
                            <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin text-blue-500" : ""}`} />
                            <span>{isSyncing ? "Syncing..." : "Sync"}</span>
                          </button>

                          <button
                            onClick={() => onNavigate?.("source_details", source.id)}
                            className="rounded border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition"
                            title="View Snapshots & Pages"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(source.id, source.name)}
                            className="rounded border border-slate-200 bg-white p-1 text-rose-500 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-rose-950/40 transition"
                            title="Delete Source"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
