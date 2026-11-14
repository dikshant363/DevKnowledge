"use client";

import React, { useState } from "react";
import {
  Compass,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Play,
  Pause,
  Layers,
  Database,
  ExternalLink,
  Shield,
  Activity,
  Sliders,
  Search,
  Filter,
  Check,
  X,
  RefreshCw,
  FolderTree,
} from "lucide-react";

interface Candidate {
  id: string;
  technology: string;
  candidate_url: string;
  domain: string;
  classification: "verified_official" | "likely_official" | "community_maintained" | "third_party" | "unverified";
  confidence_score: number;
  provider: string;
  signals: string[];
  status: "pending_review" | "auto_registered" | "rejected";
}

const INITIAL_CANDIDATES: Candidate[] = [
  {
    id: "cand-1",
    technology: "Tokio",
    candidate_url: "https://docs.rs/tokio",
    domain: "docs.rs",
    classification: "verified_official",
    confidence_score: 0.95,
    provider: "package_registries",
    signals: ["Crates.io Authoritative Manifest", "Trusted Authoritative Domain", "GitHub Stars (25k+)"],
    status: "auto_registered",
  },
  {
    id: "cand-2",
    technology: "Kubernetes",
    candidate_url: "https://kubernetes.io/docs/",
    domain: "kubernetes.io",
    classification: "verified_official",
    confidence_score: 0.98,
    provider: "official_directory",
    signals: ["CNCF Foundation Directory", "Multi-Provider Cross-Validation", "Canonical Docs Structure"],
    status: "auto_registered",
  },
  {
    id: "cand-3",
    technology: "FastAPI",
    candidate_url: "https://fastapi.tiangolo.com",
    domain: "fastapi.tiangolo.com",
    classification: "verified_official",
    confidence_score: 0.94,
    provider: "package_registries",
    signals: ["PyPI Official Homepage", "GitHub Stars (75k+)", "License Metadata (MIT)"],
    status: "auto_registered",
  },
  {
    id: "cand-4",
    technology: "SwiftUI CheatSheet",
    candidate_url: "https://swiftui-notes.example.com",
    domain: "swiftui-notes.example.com",
    classification: "community_maintained",
    confidence_score: 0.62,
    provider: "search_engine",
    signals: ["Community Tutorial Structure", "Third-Party Domain"],
    status: "pending_review",
  },
  {
    id: "cand-5",
    technology: "PyTorch Unofficial Mirror",
    candidate_url: "https://pytorch-guide.blog.com",
    domain: "blog.com",
    classification: "third_party",
    confidence_score: 0.40,
    provider: "search_engine",
    signals: ["Blog Host Indicator", "No Official Manifest"],
    status: "pending_review",
  },
];

const INITIAL_PROVIDERS = [
  { name: "package_registries", display: "Package Registries (PyPI, Crates.io, npm)", used: 48, limit: 1000, enabled: true },
  { name: "official_directory", display: "Official Foundation Directories (CNCF, Apache, Linux)", used: 12, limit: 2000, enabled: true },
  { name: "github_api", display: "GitHub Organization & Repository API", used: 34, limit: 500, enabled: true },
  { name: "search_engine", display: "Developer Search Engine API", used: 19, limit: 250, enabled: true },
  { name: "cross_reference", display: "Cross-Documentation References", used: 110, limit: 5000, enabled: true },
];

export function DiscoveryCenter() {
  const [activeTab, setActiveTab] = useState<"review" | "catalog" | "providers" | "config">("review");
  const [candidates, setCandidates] = useState<Candidate[]>(INITIAL_CANDIDATES);
  const [isPaused, setIsPaused] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [sweepStatus, setSweepStatus] = useState<string | null>(null);
  const [isSweeping, setIsSweeping] = useState(false);

  const handleApprove = (id: string) => {
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: "auto_registered", classification: "verified_official", confidence_score: 0.95 }
          : c
      )
    );
  };

  const handleReject = (id: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "rejected" } : c))
    );
  };

  const handleRunSweep = () => {
    setIsSweeping(true);
    setSweepStatus("Scanning 5 discovery providers for new technology candidates...");
    setTimeout(() => {
      setSweepStatus("Discovery complete: 4 candidates evaluated, 2 authoritative documentation roots queued for SSRF verification.");
      setIsSweeping(false);
      setTimeout(() => setSweepStatus(null), 4500);
    }, 1200);
  };

  return (
    <div className="space-y-4">
      {/* Astryx Header & Control Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-[#0f172a]">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Universal Discovery Center
            </h2>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-mono font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              Autonomous
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Discovers authoritative documentation websites across package registries and foundation directories without manual URL entry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              isPaused
                ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750"
            } astryx-focus`}
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            <span>{isPaused ? "Resume Daemon" : "Pause Daemon"}</span>
          </button>

          <button
            onClick={handleRunSweep}
            disabled={isSweeping}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition astryx-focus"
          >
            <Compass className={`h-3.5 w-3.5 ${isSweeping ? "animate-spin" : ""}`} />
            <span>{isSweeping ? "Sweeping..." : "Run Discovery Sweep"}</span>
          </button>
        </div>
      </div>

      {sweepStatus && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-indigo-200 bg-indigo-50/80 p-3 text-xs font-medium text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300 flex items-center gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSweeping ? "animate-spin" : "text-emerald-500"}`} />
          <span>{sweepStatus}</span>
        </div>
      )}

      {/* Tabs list */}
      <div className="flex border-b border-slate-200 pb-2 dark:border-slate-800 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("review")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
            activeTab === "review"
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          } astryx-focus`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Candidate Review Queue</span>
          <span className="ml-1 rounded-full bg-slate-200/60 px-1.5 py-0.2 text-[10px] font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {candidates.filter((c) => c.status === "pending_review").length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("catalog")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
            activeTab === "catalog"
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          } astryx-focus`}
        >
          <FolderTree className="h-3.5 w-3.5" />
          <span>Technology Hierarchy</span>
        </button>

        <button
          onClick={() => setActiveTab("providers")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
            activeTab === "providers"
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          } astryx-focus`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Provider Health & Quotas</span>
        </button>

        <button
          onClick={() => setActiveTab("config")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
            activeTab === "config"
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          } astryx-focus`}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Autonomous Policies</span>
        </button>
      </div>

      {/* Tab 1: Review Queue */}
      {activeTab === "review" && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="relative w-full sm:w-72">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                <Search className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Filter candidates..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-100 astryx-focus"
              />
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Auto-register threshold: &ge; 85% confidence
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-[#0f172a]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="p-3">Technology & URL</th>
                  <th className="p-3">Confidence & Evidence Signals</th>
                  <th className="p-3">Classification</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {candidates
                  .filter(
                    (c) =>
                      !filterQuery ||
                      c.technology.toLowerCase().includes(filterQuery.toLowerCase()) ||
                      c.domain.includes(filterQuery)
                  )
                  .map((cand) => (
                    <tr key={cand.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {cand.technology}
                        </div>
                        <a
                          href={cand.candidate_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          <span>{cand.domain}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className={`h-full ${
                                cand.confidence_score >= 0.85
                                  ? "bg-emerald-500"
                                  : cand.confidence_score >= 0.6
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                              style={{ width: `${cand.confidence_score * 100}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {Math.round(cand.confidence_score * 100)}%
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {cand.signals.map((sig, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-slate-100 px-1.5 py-0.2 font-mono text-[9px] text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            >
                              {sig}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="p-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            cand.classification === "verified_official"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : cand.classification === "likely_official"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : cand.classification === "community_maintained"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {cand.classification.replace("_", " ")}
                        </span>
                      </td>

                      <td className="p-3">
                        {cand.status === "auto_registered" && (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Auto-Registered
                          </span>
                        )}
                        {cand.status === "pending_review" && (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                            <Clock className="h-3.5 w-3.5" /> Pending Review
                          </span>
                        )}
                        {cand.status === "rejected" && (
                          <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                            <XCircle className="h-3.5 w-3.5" /> Rejected
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        {cand.status === "pending_review" ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleApprove(cand.id)}
                              className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 transition astryx-focus"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(cand.id)}
                              className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300 transition astryx-focus"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="font-mono text-[10px] text-slate-400">Archived</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Technology Hierarchy */}
      {activeTab === "catalog" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              name: "Rust Ecosystem",
              badge: "Crates.io",
              nodes: [
                { title: "Core & Standard Library", sub: "std / core primitives" },
                { title: "Tokio", sub: "Async multi-threaded runtime" },
                { title: "Axum", sub: "Ergonomic web routing" },
                { title: "Serde", sub: "Zero-copy serialization" },
              ],
            },
            {
              name: "Python Ecosystem",
              badge: "PyPI",
              nodes: [
                { title: "FastAPI", sub: "High-performance API framework" },
                { title: "Pydantic v2", sub: "Rust-backed schema validation" },
                { title: "PyTorch", sub: "Deep learning tensor platform" },
                { title: "NumPy", sub: "Vectorized numerical computing" },
              ],
            },
            {
              name: "Apple Platform",
              badge: "Apple Developer",
              nodes: [
                { title: "SwiftUI", sub: "Declarative UI across iOS/macOS" },
                { title: "Combine", sub: "Reactive asynchronous streams" },
                { title: "Swift Concurrency", sub: "Actors, async/await tasks" },
                { title: "Core Data & SwiftData", sub: "Local persistent store" },
              ],
            },
            {
              name: "Android Platform",
              badge: "AOSP",
              nodes: [
                { title: "Jetpack Compose", sub: "Modern reactive UI toolkit" },
                { title: "Kotlin Coroutines", sub: "Lightweight threads on JVM" },
                { title: "Room Database", sub: "SQLite abstraction layer" },
                { title: "Material 3", sub: "Adaptive design components" },
              ],
            },
          ].map((eco, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0f172a]"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  {eco.name}
                </h3>
                <span className="rounded bg-slate-100 px-1.5 py-0.2 font-mono text-[9px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {eco.badge}
                </span>
              </div>
              <div className="mt-3 space-y-1.5 border-l-2 border-indigo-200 pl-2.5 dark:border-indigo-900">
                {eco.nodes.map((node, nIdx) => (
                  <div key={nIdx} className="text-xs">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {node.title}
                    </div>
                    <div className="text-[10px] text-slate-400">{node.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Provider Health & Quotas */}
      {activeTab === "providers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {INITIAL_PROVIDERS.map((prov) => (
            <div
              key={prov.name}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0f172a]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                    {prov.display}
                  </div>
                  <div className="mt-0.5 text-[11px] font-mono text-slate-500">
                    Requests Today: {prov.used} / {prov.limit}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" /> Operational
                </span>
              </div>

              <div className="mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${(prov.used / prov.limit) * 100}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Usage: {((prov.used / prov.limit) * 100).toFixed(1)}%</span>
                  <span>Safety Margin: 100% Free Tier Compliant</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Autonomous Policies */}
      {activeTab === "config" && (
        <div className="max-w-xl space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0f172a]">
            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
              Autonomous Ingestion Policy
            </h4>
            <div className="mt-2.5 flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  Auto-register Verified Official Sources
                </div>
                <div className="text-[11px] text-slate-500">
                  Automatically enqueues crawler when confidence &ge; 85%.
                </div>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 astryx-focus"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0f172a]">
            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
              Blacklisted Mirror & Scraper Domains
            </h4>
            <p className="mt-1 text-[11px] text-slate-500">
              Prevent spoofed mirrors, content scraper farms, or low-quality reposts from entering canonical index.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["medium.com", "dev.to", "w3schools.com", "blogspot.com", "geeksforgeeks.org"].map(
                (domain) => (
                  <span
                    key={domain}
                    className="rounded bg-rose-50 px-2 py-0.5 font-mono text-[11px] text-rose-700 border border-rose-200 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300"
                  >
                    {domain}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
