"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  FileCode,
  FolderTree,
  ChevronRight,
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
  Code2,
  BookOpen,
  Hash,
  Terminal,
  RefreshCw,
} from "lucide-react";
import { api, ArtifactRecord } from "@/lib/api";
import { ActiveTab } from "./NavigationShell";

interface ArtifactViewerProps {
  onNavigate?: (tab: ActiveTab, artifactId?: string) => void;
}

export function ArtifactViewer({ onNavigate }: ArtifactViewerProps) {
  const [artifacts, setArtifacts] = useState<ArtifactRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");

  const fetchArtifacts = async () => {
    setIsLoading(true);
    try {
      const list = await api.listArtifacts();
      setArtifacts(list || []);
    } catch (e) {
      console.error("Failed to load artifacts:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArtifacts();
  }, []);

  const filtered = artifacts.filter((a) => {
    if (filterType === "all") return true;
    return a.artifact_type === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Canonical Knowledge Repository (CKR)
            </h1>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-mono font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              {artifacts.length} Compiled Bundles
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Immutable, SHA-256 verified AI documentation artifacts: llms.txt, llms-full.txt, SKILL.md, and AGENTS.md.
          </p>
        </div>

        <button
          onClick={fetchArtifacts}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition astryx-focus"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Artifacts</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5">
        {["all", "llms_txt", "llms_full_txt", "skill_md", "agents_md"].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`rounded-md px-2.5 py-1 text-xs font-mono transition astryx-focus ${
              filterType === t
                ? "bg-emerald-600 text-white font-semibold"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {t === "all" ? "All Formats" : t.replace("_", ".")}
          </button>
        ))}
      </div>

      {/* Artifacts Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-[#0c101d] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <tr>
                <th className="py-3 px-4">Artifact Name & Type</th>
                <th className="py-3 px-3">Target Source ID</th>
                <th className="py-3 px-3">Storage Path</th>
                <th className="py-3 px-3">SHA-256 Checksum</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-emerald-500 mb-2" />
                    <span>Loading compiled CKR artifacts from storage...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No artifacts matching filter.
                  </td>
                </tr>
              ) : (
                filtered.map((art) => (
                  <tr key={art.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {art.artifact_type.toUpperCase()}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        v{art.artifact_version} • ID: {art.id.slice(0, 8)}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {art.source_id}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 max-w-[240px] truncate">
                      {art.storage_location}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500 max-w-[160px] truncate">
                      {art.checksum}
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400 font-mono">
                        <ShieldCheck className="h-3 w-3" />
                        {art.generation_status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onNavigate?.("artifact_preview", art.id)}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition astryx-focus"
                      >
                        <FileCode className="h-3 w-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
