"use client";

import React, { useState, useEffect } from "react";
import {
  Network,
  FolderTree,
  Search,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Tag,
  ArrowRight,
  Code2,
} from "lucide-react";
import { api, TechnologyRecord } from "@/lib/api";
import { ActiveTab } from "./NavigationShell";

interface TechnologyCatalogProps {
  onNavigate?: (tab: ActiveTab) => void;
}

export function TechnologyCatalog({ onNavigate }: TechnologyCatalogProps) {
  const [technologies, setTechnologies] = useState<TechnologyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterEcosystem, setFilterEcosystem] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadTech() {
      setIsLoading(true);
      try {
        const list = await api.listTechnologies();
        setTechnologies(list || []);
      } catch (e) {
        console.error("Failed to load technologies:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadTech();
  }, []);

  const ecosystems = [
    { id: "all", label: "All Ecosystems" },
    { id: "rust", label: "Rust" },
    { id: "python", label: "Python" },
    { id: "javascript", label: "JavaScript / TS" },
    { id: "cloud", label: "Cloud & DevOps" },
    { id: "android", label: "Android / Dart" },
    { id: "apple", label: "Apple / Swift" },
  ];

  const filtered = technologies.filter((tech) => {
    if (filterEcosystem !== "all" && tech.ecosystem !== filterEcosystem) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        tech.name.toLowerCase().includes(q) ||
        tech.category.toLowerCase().includes(q) ||
        (tech.description && tech.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Technology Catalog & Taxonomy
            </h1>
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-mono font-semibold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
              {technologies.length} Verified
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Hierarchical multi-parent taxonomy of programming languages, frameworks, SDKs, and developer tools.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search technologies by name or category..."
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden dark:border-slate-800 dark:bg-[#0c101d] dark:text-slate-100"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          {ecosystems.map((eco) => (
            <button
              key={eco.id}
              onClick={() => setFilterEcosystem(eco.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition astryx-focus ${
                filterEcosystem === eco.id
                  ? "bg-violet-600 text-white font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              }`}
            >
              {eco.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tech Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 py-16 text-center text-xs text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto text-violet-500 mb-2" />
            <span>Loading technology catalog...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-xs text-slate-500">
            No technologies found matching criteria.
          </div>
        ) : (
          filtered.map((tech) => (
            <div
              key={tech.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-[#0c101d] transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {tech.name}
                  </span>
                  <span className="rounded bg-violet-50 border border-violet-200 px-2 py-0.5 text-[10px] font-mono text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-400">
                    {tech.category}
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-mono text-slate-400">
                  Slug: {tech.slug} • Ecosystem: {tech.ecosystem}
                </div>
                {tech.description && (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                    {tech.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                {tech.website_url ? (
                  <a
                    href={tech.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                  >
                    <span>Official Portal</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-400">No URL recorded</span>
                )}

                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-3 w-3" />
                  Official
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
