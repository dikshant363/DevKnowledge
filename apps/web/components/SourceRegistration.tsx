"use client";

import React, { useState } from "react";
import {
  BookOpen,
  PlusCircle,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Globe,
  Sliders,
  Clock,
  Layers,
} from "lucide-react";
import { api } from "@/lib/api";
import { ActiveTab } from "./NavigationShell";

interface SourceRegistrationProps {
  onNavigate: (tab: ActiveTab, sourceId?: string) => void;
  onRegistered?: (name: string) => void;
}

export function SourceRegistration({ onNavigate, onRegistered }: SourceRegistrationProps) {
  const [name, setName] = useState("");
  const [rootUrl, setRootUrl] = useState("");
  const [category, setCategory] = useState("rust");
  const [version, setVersion] = useState("");
  const [docType, setDocType] = useState("official");
  const [maxDepth, setMaxDepth] = useState(5);
  const [syncInterval, setSyncInterval] = useState(6);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live SSRF check indicator
  const isSsrfUnsafe =
    rootUrl.includes("127.0.0.1") ||
    rootUrl.includes("localhost") ||
    rootUrl.includes("169.254.") ||
    rootUrl.includes("10.0.") ||
    rootUrl.includes("192.168.");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !rootUrl.trim()) return;

    if (isSsrfUnsafe) {
      setErrorMsg("Security Error: Target URL resolves to a protected or loopback IP range (SSRF blocked).");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const created = await api.createSource({
        name,
        root_url: rootUrl,
        category,
        documentation_type: docType,
        source_version: version || undefined,
        crawl_config: { max_depth: maxDepth, respect_robots: true },
        sync_policy: { interval_hours: syncInterval },
      });

      setSuccessMsg(`Source '${created.name}' registered and crawler scheduled!`);
      onRegistered?.(created.name);
      setTimeout(() => {
        onNavigate("sources");
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to register documentation source.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <PlusCircle className="h-5 w-5 text-blue-500" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Register Documentation Source
          </h1>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Add an authoritative documentation website for continuous extraction, version pinning, and AI agent compilation.
        </p>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Registration Form Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs dark:border-slate-800 dark:bg-[#0c101d] transition-colors">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Source Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Source Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tokio, FastAPI, React, Axum"
              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 p-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:focus:bg-slate-950"
            />
          </div>

          {/* Root URL & SSRF Validation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Canonical Root URL *
              </label>
              {rootUrl && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-mono font-medium ${
                    isSsrfUnsafe
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {isSsrfUnsafe ? (
                    <>
                      <AlertTriangle className="h-3 w-3" /> SSRF Blocked (Loopback/Private IP)
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3 w-3" /> Public Origin Approved
                    </>
                  )}
                </span>
              )}
            </div>
            <div className="relative">
              <Globe className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="url"
                required
                value={rootUrl}
                onChange={(e) => setRootUrl(e.target.value)}
                placeholder="https://docs.rs/tokio"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:focus:bg-slate-950 font-mono"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Target origin must resolve to a routable public IP and adhere to robots.txt terms.
            </p>
          </div>

          {/* Ecosystem Category & Pinned Version */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ecosystem Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 p-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
              >
                <option value="rust">Rust (Crates.io)</option>
                <option value="python">Python (PyPI)</option>
                <option value="javascript">JavaScript / TypeScript (npm)</option>
                <option value="cloud">Cloud & DevOps (CNCF, AWS, GCP)</option>
                <option value="android">Android (Kotlin / Dart / Flutter)</option>
                <option value="apple">Apple (Swift / Objective-C)</option>
                <option value="general">General / Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Version Pin (Optional)
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. 1.38.0, 18.3.1, stable"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 p-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          {/* Crawler Tuning: Depth & Sync Interval */}
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Maximum Crawl Depth
              </label>
              <select
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 p-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
              >
                <option value={3}>3 Levels (Shallow)</option>
                <option value={5}>5 Levels (Standard)</option>
                <option value={8}>8 Levels (Deep Index)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sync Inspection Frequency
              </label>
              <select
                value={syncInterval}
                onChange={(e) => setSyncInterval(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 p-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
              >
                <option value={6}>Every 6 Hours (Fast releases)</option>
                <option value={12}>Every 12 Hours (Twice daily)</option>
                <option value={24}>Every 24 Hours (Daily)</option>
                <option value={168}>Weekly (Stable docs)</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate("sources")}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isSsrfUnsafe}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition disabled:opacity-50 astryx-focus"
            >
              <span>{isSubmitting ? "Registering & Enqueuing..." : "Confirm & Queue Crawl"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
