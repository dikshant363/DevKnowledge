import React from "react";
import { Navbar } from "@/components/Navbar";
import { Search, Globe, Shield, RefreshCw, Zap, ArrowRight, BookOpen, Layers } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-300">
                <Zap className="h-3.5 w-3.5" />
                Continuous AI Documentation Intelligence
              </div>

              <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-6xl">
                One URL. Every API. <br />
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Live in your AI Agents.
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
                DevKnowledge ingests documentation websites, extracts canonical structured technical knowledge,
                monitors upstream changes, and serves version-pinned docs directly to connected AI coding agents.
              </p>

              {/* URL Registration Box */}
              <div className="mx-auto mt-10 max-w-xl">
                <form className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-1 items-center gap-2 px-3">
                    <Globe className="h-5 w-5 text-slate-400" />
                    <input
                      type="url"
                      placeholder="https://docs.rs, https://developer.android.com/..."
                      className="w-full bg-transparent text-sm focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 transition"
                  >
                    Index Docs
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="border-t border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold">SSRF-Hardened Crawler</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  DNS pre-flight checks, private subnet blocking, and redirect revalidation prevent internal network probing.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <RefreshCw className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold">Continuous Synchronization</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Detects modified pages via hashes, ETags, and sitemaps. Atomically publishes immutable release snapshots.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                  <Layers className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold">Native Rust CLI & MCP</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Ultra-fast local SQLite cache for offline search on macOS, Linux, and Windows. Native MCP server for coding agents.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800">
        DevKnowledge v1.0 — Architecture Baseline &copy; 2026. Open source under Apache 2.0.
      </footer>
    </div>
  );
}
