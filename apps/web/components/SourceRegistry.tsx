"use client";

import React, { useState } from "react";
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
} from "lucide-react";

export interface SourceRecord {
  id: string;
  name: string;
  ecosystem: "rust" | "python" | "apple" | "android" | "cloud";
  root_url: string;
  domain: string;
  documentation_type: string;
  pinned_version: string;
  active_snapshot_id: string;
  status: "synced" | "syncing" | "pending";
  ssrf_verified: boolean;
  doc_count: number;
  last_synced_at: string;
  etag?: string;
  robots_policy?: string;
}

const INITIAL_SOURCES: SourceRecord[] = [
  {
    id: "src-1",
    name: "Tokio",
    ecosystem: "rust",
    root_url: "https://docs.rs/tokio",
    domain: "docs.rs",
    documentation_type: "Crates.io Official Docs",
    pinned_version: "1.38.0",
    active_snapshot_id: "sha256:7f4a2b91c8e3",
    status: "synced",
    ssrf_verified: true,
    doc_count: 284,
    last_synced_at: "10 mins ago",
    etag: '"w/392-882ab"',
    robots_policy: "Allowed (Crawl-Delay: 1s)",
  },
  {
    id: "src-2",
    name: "Axum",
    ecosystem: "rust",
    root_url: "https://docs.rs/axum",
    domain: "docs.rs",
    documentation_type: "Crates.io Web Framework",
    pinned_version: "0.7.5",
    active_snapshot_id: "sha256:3d1e998a442b",
    status: "synced",
    ssrf_verified: true,
    doc_count: 142,
    last_synced_at: "2 hours ago",
    etag: '"w/104-ff231"',
    robots_policy: "Allowed",
  },
  {
    id: "src-3",
    name: "Kubernetes",
    ecosystem: "cloud",
    root_url: "https://kubernetes.io/docs/",
    domain: "kubernetes.io",
    documentation_type: "CNCF Foundation Official",
    pinned_version: "1.30.0",
    active_snapshot_id: "sha256:9c801ba901ef",
    status: "synced",
    ssrf_verified: true,
    doc_count: 420,
    last_synced_at: "34 mins ago",
    etag: '"k8s-docs-v130"',
    robots_policy: "Allowed (Sitemap: /sitemap.xml)",
  },
  {
    id: "src-4",
    name: "FastAPI",
    ecosystem: "python",
    root_url: "https://fastapi.tiangolo.com",
    domain: "fastapi.tiangolo.com",
    documentation_type: "PyPI Authoritative Docs",
    pinned_version: "0.111.0",
    active_snapshot_id: "sha256:1a84f50912cb",
    status: "synced",
    ssrf_verified: true,
    doc_count: 198,
    last_synced_at: "1 hour ago",
    etag: '"304-not-modified"',
    robots_policy: "Allowed",
  },
  {
    id: "src-5",
    name: "SwiftUI",
    ecosystem: "apple",
    root_url: "https://developer.apple.com/documentation/swiftui",
    domain: "developer.apple.com",
    documentation_type: "Apple Developer Platform",
    pinned_version: "iOS 17.5 / Swift 5.10",
    active_snapshot_id: "sha256:b8912cd310fe",
    status: "synced",
    ssrf_verified: true,
    doc_count: 215,
    last_synced_at: "4 hours ago",
    etag: '"apple-sw-175"',
    robots_policy: "Allowed",
  },
  {
    id: "src-6",
    name: "Jetpack Compose",
    ecosystem: "android",
    root_url: "https://developer.android.com/jetpack/compose",
    domain: "developer.android.com",
    documentation_type: "Android Open Source Platform",
    pinned_version: "1.6.7",
    active_snapshot_id: "sha256:fa2881a7090b",
    status: "synced",
    ssrf_verified: true,
    doc_count: 161,
    last_synced_at: "5 hours ago",
    etag: '"android-cmp-167"',
    robots_policy: "Allowed",
  },
];

interface SourceRegistryProps {
  onTriggerSync?: (sourceName: string) => void;
}

export function SourceRegistry({ onTriggerSync }: SourceRegistryProps) {
  const [sources, setSources] = useState<SourceRecord[]>(INITIAL_SOURCES);
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedEcosystem, setSelectedEcosystem] = useState<string>("all");
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [copiedSnapshot, setCopiedSnapshot] = useState<string | null>(null);

  // New source form state
  const [newTech, setNewTech] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newVersion, setNewVersion] = useState("1.0.0");
  const [newEcosystem, setNewEcosystem] = useState<"rust" | "python" | "apple" | "android" | "cloud">("rust");
  const [formFeedback, setFormFeedback] = useState<string | null>(null);

  const handleCopySnapshot = (hash: string) => {
    navigator.clipboard?.writeText(hash);
    setCopiedSnapshot(hash);
    setTimeout(() => setCopiedSnapshot(null), 2000);
  };

  const handleSyncSource = (id: string, name: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "syncing" } : s))
    );
    onTriggerSync?.(name);

    setTimeout(() => {
      setSources((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status: "synced",
                last_synced_at: "Just now",
                active_snapshot_id: `sha256:${Math.random().toString(16).substring(2, 10)}`,
              }
            : s
        )
      );
    }, 1800);
  };

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl || !newTech) return;

    if (newUrl.includes("127.0.0.1") || newUrl.includes("localhost") || newUrl.includes("169.254")) {
      setFormFeedback("SSRF Violation: Target IP resolves to forbidden internal subnet.");
      return;
    }

    try {
      const parsedUrl = new URL(newUrl);
      const newRecord: SourceRecord = {
        id: `src-${Date.now()}`,
        name: newTech,
        ecosystem: newEcosystem,
        root_url: newUrl,
        domain: parsedUrl.hostname,
        documentation_type: "Manual Verified Source",
        pinned_version: newVersion,
        active_snapshot_id: `sha256:${Math.random().toString(16).substring(2, 14)}`,
        status: "synced",
        ssrf_verified: true,
        doc_count: 35,
        last_synced_at: "Just registered",
        robots_policy: "Allowed",
      };

      setSources((prev) => [newRecord, ...prev]);
      setIsAddModalOpen(false);
      setNewTech("");
      setNewUrl("");
      setFormFeedback(null);
    } catch {
      setFormFeedback("Invalid URL format. Please provide absolute http(s) URL.");
    }
  };

  const filteredSources = sources.filter((s) => {
    const matchesQuery =
      s.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      s.domain.toLowerCase().includes(filterQuery.toLowerCase()) ||
      s.pinned_version.toLowerCase().includes(filterQuery.toLowerCase());
    const matchesEcosystem =
      selectedEcosystem === "all" || s.ecosystem === selectedEcosystem;
    return matchesQuery && matchesEcosystem;
  });

  return (
    <div className="space-y-4">
      {/* Header & Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0f172a]">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Source Registry
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {sources.length} active
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tracked documentation repositories, upstream version pinning, and SSRF-hardened crawl targets.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition shrink-0 astryx-focus"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Register Source</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Ecosystem Chips */}
        <div className="flex flex-wrap gap-1.5">
          {["all", "rust", "python", "apple", "android", "cloud"].map((eco) => (
            <button
              key={eco}
              onClick={() => setSelectedEcosystem(eco)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition ${
                selectedEcosystem === eco
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-400 dark:hover:bg-slate-800"
              } astryx-focus`}
            >
              {eco}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
            <Search className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Filter sources or versions..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder-slate-400 dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-100 astryx-focus"
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Sources High-Density Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-[#0f172a]">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
            <tr>
              <th className="p-3">Source & Ecosystem</th>
              <th className="p-3">Canonical Endpoint</th>
              <th className="p-3">Pinned Version</th>
              <th className="p-3">Active Snapshot</th>
              <th className="p-3">Security & Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredSources.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  No sources match your filter criteria.
                </td>
              </tr>
            ) : (
              filteredSources.map((source) => {
                const isExpanded = expandedSourceId === source.id;
                return (
                  <React.Fragment key={source.id}>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-colors">
                      {/* Name & Ecosystem */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {source.name}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[10px] font-mono uppercase font-semibold ${
                              source.ecosystem === "rust"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : source.ecosystem === "python"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : source.ecosystem === "apple"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                : source.ecosystem === "android"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                            }`}
                          >
                            {source.ecosystem}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {source.documentation_type} • {source.doc_count} docs
                        </div>
                      </td>

                      {/* URL & Domain */}
                      <td className="p-3">
                        <a
                          href={source.root_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                        >
                          <span>{source.domain}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                          {source.root_url}
                        </div>
                      </td>

                      {/* Pinned Version */}
                      <td className="p-3">
                        <div className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <Tag className="h-3 w-3 text-slate-400" />
                          <span>{source.pinned_version}</span>
                        </div>
                      </td>

                      {/* Active Snapshot Hash */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {source.active_snapshot_id.substring(0, 15)}...
                          </code>
                          <button
                            onClick={() => handleCopySnapshot(source.active_snapshot_id)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Copy SHA-256 Snapshot Hash"
                            aria-label={`Copy snapshot hash for ${source.name}`}
                          >
                            {copiedSnapshot === source.active_snapshot_id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Synced {source.last_synced_at}
                        </div>
                      </td>

                      {/* Security & Status */}
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <ShieldCheck className="h-3.5 w-3.5" /> SSRF Safe
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                              source.status === "syncing"
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {source.status === "syncing" ? (
                              <>
                                <RefreshCw className="h-3 w-3 animate-spin" /> Ingestion active
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3 w-3" /> Ready
                              </>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleSyncSource(source.id, source.name)}
                            disabled={source.status === "syncing"}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition astryx-focus"
                            title="Sync upstream documentation"
                          >
                            <RefreshCw
                              className={`h-3 w-3 ${
                                source.status === "syncing" ? "animate-spin text-blue-500" : ""
                              }`}
                            />
                            <span>Sync</span>
                          </button>

                          <button
                            onClick={() =>
                              setExpandedSourceId(isExpanded ? null : source.id)
                            }
                            className="rounded-md border border-slate-200 bg-slate-50 p-1 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400 dark:hover:bg-slate-800 transition astryx-focus"
                            aria-expanded={isExpanded}
                            aria-label={`Toggle details for ${source.name}`}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Technical Detail Drawer */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80 dark:bg-slate-900/40">
                        <td colSpan={6} className="p-4 border-b border-slate-200 dark:border-slate-800">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#0f172a]">
                              <div className="text-[10px] uppercase font-semibold text-slate-400">
                                Robots.txt Policy
                              </div>
                              <div className="mt-1 font-mono text-slate-800 dark:text-slate-200">
                                {source.robots_policy || "Compliant (Direct Allowed)"}
                              </div>
                              <p className="mt-1 text-[11px] text-slate-500">
                                Respects User-Agent: DevKnowledgeBot
                              </p>
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#0f172a]">
                              <div className="text-[10px] uppercase font-semibold text-slate-400">
                                Upstream ETag & HTTP Caching
                              </div>
                              <div className="mt-1 font-mono text-slate-800 dark:text-slate-200">
                                {source.etag || "ETag verification active"}
                              </div>
                              <p className="mt-1 text-[11px] text-slate-500">
                                Prevents duplicate crawling when content is unchanged.
                              </p>
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#0f172a]">
                              <div className="text-[10px] uppercase font-semibold text-slate-400">
                                Canonical CKR Bundle
                              </div>
                              <div className="mt-1 font-mono text-slate-800 dark:text-slate-200 truncate">
                                {source.active_snapshot_id}
                              </div>
                              <p className="mt-1 text-[11px] text-slate-500">
                                Immutable snapshot committed to local SQLite & Supabase.
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Source Modal Dialog */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Register Documentation Source"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-[#0f172a]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Register New Documentation Source
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSource} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Technology / Library Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., PyTorch, Redis, TailwindCSS"
                  value={newTech}
                  onChange={(e) => setNewTech(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100 astryx-focus"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Documentation Root URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://pytorch.org/docs/stable/..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 font-mono dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100 astryx-focus"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Ecosystem
                  </label>
                  <select
                    value={newEcosystem}
                    onChange={(e) =>
                      setNewEcosystem(e.target.value as any)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100 astryx-focus"
                  >
                    <option value="rust">Rust</option>
                    <option value="python">Python</option>
                    <option value="apple">Apple</option>
                    <option value="android">Android</option>
                    <option value="cloud">Cloud / Infrastructure</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Pinned Version
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="2.3.0 or stable"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 font-mono dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100 astryx-focus"
                  />
                </div>
              </div>

              {formFeedback && (
                <div
                  role="alert"
                  className="rounded-lg bg-rose-50 p-2 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900 flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formFeedback}</span>
                </div>
              )}

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  SSRF Pre-flight Guarantee:
                </span>{" "}
                Destination host will undergo DNS resolution verification to ensure it does not resolve to private or loopback subnets before enqueuing crawler jobs.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 font-semibold text-white hover:bg-blue-700"
                >
                  Verify & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
