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
  const [activeTab, setActiveTab] = useState<"catalog" | "review" | "providers" | "config">("review");
  const [candidates, setCandidates] = useState<Candidate[]>(INITIAL_CANDIDATES);
  const [isPaused, setIsPaused] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [sweepStatus, setSweepStatus] = useState<string | null>(null);

  const handleApprove = (id: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "auto_registered", classification: "verified_official", confidence_score: 0.95 } : c))
    );
  };

  const handleReject = (id: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "rejected" } : c))
    );
  };

  const handleRunSweep = () => {
    setSweepStatus("Running discovery sweep across 5 providers...");
    setTimeout(() => {
      setSweepStatus("Discovery complete: 4 new candidates evaluated, 2 official sources verified and queued for crawling.");
      setTimeout(() => setSweepStatus(null), 4000);
    }, 1200);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold">Universal Documentation Discovery Center</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Continuously discovers technologies and official documentation websites across the internet without manual URL entry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              isPaused
                ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                : "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {isPaused ? "Resume Discovery" : "Pause Discovery"}
          </button>

          <button
            onClick={handleRunSweep}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-700 transition"
          >
            <Compass className="h-3.5 w-3.5" />
            Run Discovery Sweep
          </button>
        </div>
      </div>

      {sweepStatus && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-medium text-blue-800 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300">
          {sweepStatus}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-5 flex gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("review")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            activeTab === "review"
              ? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <Clock className="h-4 w-4" />
          Candidate Review Queue
        </button>

        <button
          onClick={() => setActiveTab("catalog")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            activeTab === "catalog"
              ? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <Layers className="h-4 w-4" />
          Technology Catalog
        </button>

        <button
          onClick={() => setActiveTab("providers")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            activeTab === "providers"
              ? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <Activity className="h-4 w-4" />
          Provider Health & Quotas
        </button>

        <button
          onClick={() => setActiveTab("config")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            activeTab === "config"
              ? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <Sliders className="h-4 w-4" />
          Configuration & Policy
        </button>
      </div>

      {/* Tab 1: Candidate Review Queue */}
      {activeTab === "review" && (
        <div className="mt-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-800">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter candidates..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="bg-transparent focus:outline-none"
              />
            </div>
            <span className="text-xs text-slate-500">
              {candidates.filter((c) => c.status === "pending_review").length} pending human review
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                <tr>
                  <th className="p-3">Technology & URL</th>
                  <th className="p-3">Confidence & Evidence</th>
                  <th className="p-3">Classification</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {candidates
                  .filter((c) => !filterQuery || c.technology.toLowerCase().includes(filterQuery.toLowerCase()) || c.domain.includes(filterQuery))
                  .map((cand) => (
                    <tr key={cand.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{cand.technology}</div>
                        <a
                          href={cand.candidate_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-slate-500 hover:text-blue-600"
                        >
                          {cand.domain}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className={`h-full ${cand.confidence_score >= 0.85 ? "bg-emerald-500" : cand.confidence_score >= 0.6 ? "bg-amber-500" : "bg-rose-500"}`}
                              style={{ width: `${cand.confidence_score * 100}%` }}
                            />
                          </div>
                          <span className="font-semibold">{Math.round(cand.confidence_score * 100)}%</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {cand.signals.slice(0, 2).map((sig, idx) => (
                            <span key={idx} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              {sig}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            cand.classification === "verified_official"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : cand.classification === "likely_official"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                              : cand.classification === "community_maintained"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {cand.classification.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-3">
                        {cand.status === "auto_registered" && (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Auto-Registered
                          </span>
                        )}
                        {cand.status === "pending_review" && (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                            <Clock className="h-3.5 w-3.5" /> Pending Review
                          </span>
                        )}
                        {cand.status === "rejected" && (
                          <span className="inline-flex items-center gap-1 font-semibold text-rose-600">
                            <XCircle className="h-3.5 w-3.5" /> Rejected
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {cand.status === "pending_review" && (
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => handleApprove(cand.id)}
                              className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(cand.id)}
                              className="rounded bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Technology Catalog Hierarchy */}
      {activeTab === "catalog" && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="font-bold text-sm">Apple Ecosystem</h3>
            <div className="mt-3 space-y-2 text-xs">
              <div className="rounded-lg bg-slate-50 p-2 font-semibold dark:bg-slate-800">Apple Developer Platform</div>
              <div className="ml-4 border-l-2 border-slate-200 pl-3 space-y-1 dark:border-slate-800">
                <div>iOS (Operating System)</div>
                <div className="ml-4 border-l-2 border-slate-200 pl-3 dark:border-slate-800">
                  <div>Swift (Programming Language)</div>
                  <div className="ml-4 border-l-2 border-blue-400 pl-3 font-semibold text-blue-600 dark:text-blue-400">
                    SwiftUI (UI Framework)
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="font-bold text-sm">Android Ecosystem</h3>
            <div className="mt-3 space-y-2 text-xs">
              <div className="rounded-lg bg-slate-50 p-2 font-semibold dark:bg-slate-800">Android Open Source Platform</div>
              <div className="ml-4 border-l-2 border-slate-200 pl-3 space-y-1 dark:border-slate-800">
                <div>Kotlin (JVM Language)</div>
                <div className="ml-4 border-l-2 border-slate-200 pl-3 dark:border-slate-800">
                  <div className="font-semibold text-indigo-600 dark:text-indigo-400">Jetpack Compose (Modern UI)</div>
                  <div className="ml-4 border-l-2 border-purple-400 pl-3">Material 3 (Design System)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="font-bold text-sm">Rust Ecosystem</h3>
            <div className="mt-3 space-y-2 text-xs">
              <div className="rounded-lg bg-slate-50 p-2 font-semibold dark:bg-slate-800">Rust Language</div>
              <div className="ml-4 border-l-2 border-slate-200 pl-3 space-y-1 dark:border-slate-800">
                <div>Cargo & Crates.io</div>
                <div className="ml-4 border-l-2 border-slate-200 pl-3 dark:border-slate-800">
                  <div>Tokio (Async Runtime)</div>
                  <div className="ml-4 border-l-2 border-emerald-400 pl-3 font-semibold text-emerald-600 dark:text-emerald-400">
                    Axum (Modular Web Framework)
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="font-bold text-sm">Python Ecosystem</h3>
            <div className="mt-3 space-y-2 text-xs">
              <div className="rounded-lg bg-slate-50 p-2 font-semibold dark:bg-slate-800">Python Language</div>
              <div className="ml-4 border-l-2 border-slate-200 pl-3 space-y-1 dark:border-slate-800">
                <div>PyPI Registry</div>
                <div className="ml-4 border-l-2 border-slate-200 pl-3 dark:border-slate-800">
                  <div>FastAPI (Web Framework)</div>
                  <div>PyTorch (AI/ML Tensor Framework)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Provider Health & Quotas */}
      {activeTab === "providers" && (
        <div className="mt-4 space-y-3">
          {INITIAL_PROVIDERS.map((prov) => (
            <div key={prov.name} className="flex items-center justify-between rounded-xl border border-slate-200 p-4 text-xs dark:border-slate-800">
              <div>
                <div className="font-bold text-sm">{prov.display}</div>
                <div className="mt-1 text-slate-500">
                  Requests Today: {prov.used} / {prov.limit} daily quota
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-32 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-2 bg-blue-600"
                    style={{ width: `${(prov.used / prov.limit) * 100}%` }}
                  />
                </div>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Operational
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Configuration & Policies */}
      {activeTab === "config" && (
        <div className="mt-4 max-w-xl space-y-4 text-xs">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <h4 className="font-bold text-sm">Autonomous Registration Policy</h4>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <div className="font-semibold">Auto-register Verified Official Sources</div>
                <div className="text-slate-500">Automatically enqueue crawler and CKR compilation for sources with &ge; 85% confidence.</div>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded text-blue-600" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <h4 className="font-bold text-sm">Rejected Domains & Blacklist</h4>
            <p className="mt-1 text-slate-500">Prevent spoofed mirrors, content scrapers, or low-quality blog farms.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded bg-rose-100 px-2 py-1 text-rose-700 dark:bg-rose-950 dark:text-rose-300">medium.com</span>
              <span className="rounded bg-rose-100 px-2 py-1 text-rose-700 dark:bg-rose-950 dark:text-rose-300">dev.to</span>
              <span className="rounded bg-rose-100 px-2 py-1 text-rose-700 dark:bg-rose-950 dark:text-rose-300">w3schools.com</span>
              <span className="rounded bg-rose-100 px-2 py-1 text-rose-700 dark:bg-rose-950 dark:text-rose-300">blogspot.com</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
