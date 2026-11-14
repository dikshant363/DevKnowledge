"use client";

import React, { useState } from "react";
import {
  Settings,
  Key,
  ShieldCheck,
  Server,
  Database,
  Copy,
  Check,
  Sun,
  Moon,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { ActiveTab } from "./NavigationShell";

interface SettingsViewProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onNavigate?: (tab: ActiveTab) => void;
}

export function SettingsView({ isDark, onToggleTheme, onNavigate }: SettingsViewProps) {
  const [apiKey, setApiKey] = useState("dk_live_94hJXMqlUflziVyB9TlS4f34OGAmu_bE");
  const [copiedKey, setCopiedKey] = useState(false);
  const [storageBackend, setStorageBackend] = useState("supabase");
  const [ssrfStrict, setSsrfStrict] = useState(true);
  const [rateLimitRps, setRateLimitRps] = useState(5);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleGenerateKey = () => {
    const newKey = `dk_live_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;
    setApiKey(newKey);
    setSaveFeedback("Generated new API Access Token.");
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveFeedback("Workstation settings updated successfully.");
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-slate-500" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Workstation Settings & Security Configuration
          </h1>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Manage API credentials, storage backend adapters, rate limits, and network SSRF boundaries.
        </p>
      </div>

      {saveFeedback && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-semibold text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300">
          {saveFeedback}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* API Credentials Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-[#0c101d]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Agent & Runner API Key
              </h2>
              <p className="text-xs text-slate-500">
                Required by the MCP server, CLI, and remote crawler runners to authenticate against the API Gateway.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateKey}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Rotate Token</span>
            </button>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={apiKey}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 select-all"
              />
              <button
                type="button"
                onClick={handleCopyKey}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition shrink-0"
              >
                {copiedKey ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedKey ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Storage Backend Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-[#0c101d]">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
            Storage Engine Adapter
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Select the destination for immutable CKR snapshot bundles and exported documentation files.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: "supabase", title: "Supabase Storage", desc: "Built-in S3-compatible cloud storage bucket" },
              { id: "r2", title: "Cloudflare R2", desc: "Zero-egress object storage at ₹0/month" },
              { id: "local", title: "Local Filesystem", desc: "Self-hosted storage on local disk (./storage)" },
            ].map((opt) => (
              <label
                key={opt.id}
                className={`flex flex-col justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                  storageBackend === opt.id
                    ? "border-blue-500 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{opt.title}</span>
                    <input
                      type="radio"
                      name="storage"
                      value={opt.id}
                      checked={storageBackend === opt.id}
                      onChange={(e) => setStorageBackend(e.target.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 leading-tight">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Security & SSRF Safeguards */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-[#0c101d]">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
            Network Security & SSRF Safeguards
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Enforces strict pre-flight DNS address validation before initiating HTTP crawler fetch requests.
          </p>

          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Block Private IP Ranges (RFC 1918 / RFC 3927)
                </div>
                <div className="text-[11px] text-slate-500">
                  Prevents crawling 127.0.0.1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, and cloud metadata (169.254.169.254).
                </div>
              </div>
              <input
                type="checkbox"
                checked={ssrfStrict}
                onChange={(e) => setSsrfStrict(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <div className="border-t border-slate-100 pt-3 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Crawler Concurrency Cap
                </div>
                <div className="text-[11px] text-slate-500">
                  Maximum simultaneous HTTP connections per target origin.
                </div>
              </div>
              <select
                value={rateLimitRps}
                onChange={(e) => setRateLimitRps(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white py-1 px-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value={2}>2 Requests/sec (Gentle)</option>
                <option value={5}>5 Requests/sec (Standard)</option>
                <option value={10}>10 Requests/sec (Aggressive)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Appearance & Save */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            <span>{isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}</span>
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition astryx-focus"
          >
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
