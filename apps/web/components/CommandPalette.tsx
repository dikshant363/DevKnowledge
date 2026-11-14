"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  BookOpen,
  Compass,
  Activity,
  Layers,
  Database,
  RefreshCw,
  Terminal,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Sliders,
  CheckCircle2,
  PlusCircle,
  FileSearch,
  CheckSquare,
  Network,
  Clock,
  Sparkles,
  FileCode,
  Box,
  Settings,
  HeartPulse,
  Code2,
} from "lucide-react";
import { ActiveTab } from "./NavigationShell";

export interface CommandItem {
  id: string;
  category: "Navigation" | "Sources" | "Discovery & Ingestion" | "System Operations";
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: ActiveTab) => void;
  onTriggerSweep?: () => void;
  onTriggerSync?: (sourceName: string) => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onTriggerSweep,
  onTriggerSync,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commandItems: CommandItem[] = [
    // 1-18 Navigation Views
    {
      id: "nav-overview",
      category: "Navigation",
      title: "1. Overview Dashboard",
      description: "System telemetry, worker health, document metrics & ingestion rate",
      icon: <Activity className="h-4 w-4 text-blue-500" />,
      action: () => {
        onNavigate("overview");
        onClose();
      },
    },
    {
      id: "nav-sources",
      category: "Navigation",
      title: "2. Documentation Sources",
      description: "Manage official sources, version pinning & sync status",
      icon: <BookOpen className="h-4 w-4 text-emerald-500" />,
      action: () => {
        onNavigate("sources");
        onClose();
      },
    },
    {
      id: "nav-register-source",
      category: "Navigation",
      title: "3. Register Source",
      description: "Submit new documentation URL with real-time SSRF validation",
      icon: <PlusCircle className="h-4 w-4 text-emerald-500" />,
      action: () => {
        onNavigate("register_source");
        onClose();
      },
    },
    {
      id: "nav-source-details",
      category: "Navigation",
      title: "4. Source Details Inspector",
      description: "Inspect snapshots, indexed pages, content hashes and sync policy",
      icon: <FileSearch className="h-4 w-4 text-teal-500" />,
      action: () => {
        onNavigate("source_details");
        onClose();
      },
    },
    {
      id: "nav-discovery",
      category: "Navigation",
      title: "5. Automatic Discovery Center",
      description: "Autonomous technology & documentation discovery across internet feeds",
      icon: <Compass className="h-4 w-4 text-indigo-500" />,
      action: () => {
        onNavigate("discovery");
        onClose();
      },
    },
    {
      id: "nav-discovery-review",
      category: "Navigation",
      title: "6. Discovery Review Queue",
      description: "Approve or reject discovered candidates with verification scoring",
      icon: <CheckSquare className="h-4 w-4 text-indigo-400" />,
      action: () => {
        onNavigate("discovery_review");
        onClose();
      },
    },
    {
      id: "nav-technologies",
      category: "Navigation",
      title: "7. Technology Catalog",
      description: "Hierarchical ecosystem taxonomy: languages, frameworks & libraries",
      icon: <Network className="h-4 w-4 text-violet-500" />,
      action: () => {
        onNavigate("technologies");
        onClose();
      },
    },
    {
      id: "nav-jobs",
      category: "Navigation",
      title: "8. Crawler Jobs Monitor",
      description: "Inspect durable job queue, lease timeouts & worker assignments",
      icon: <Layers className="h-4 w-4 text-purple-500" />,
      action: () => {
        onNavigate("jobs");
        onClose();
      },
    },
    {
      id: "nav-job-details",
      category: "Navigation",
      title: "9. Job Details & Logs",
      description: "Live terminal log viewer, retry actions and failure diagnosis",
      icon: <FileCode className="h-4 w-4 text-purple-400" />,
      action: () => {
        onNavigate("job_details");
        onClose();
      },
    },
    {
      id: "nav-sync",
      category: "Navigation",
      title: "10. Synchronization Policies",
      description: "Cloudflare Cron triggers, ETag checks and manual worker dispatch",
      icon: <Clock className="h-4 w-4 text-amber-500" />,
      action: () => {
        onNavigate("sync");
        onClose();
      },
    },
    {
      id: "nav-search",
      category: "Navigation",
      title: "11. Semantic Search Explorer",
      description: "Query indexed documentation with code snippet highlighting and similarity scores",
      icon: <Search className="h-4 w-4 text-sky-500" />,
      action: () => {
        onNavigate("search");
        onClose();
      },
    },
    {
      id: "nav-artifacts",
      category: "Navigation",
      title: "12. Artifact Explorer (CKR)",
      description: "Browse compiled llms.txt, llms-full.txt, SKILL.md and AGENTS.md outputs",
      icon: <Database className="h-4 w-4 text-amber-600" />,
      action: () => {
        onNavigate("artifacts");
        onClose();
      },
    },
    {
      id: "nav-artifact-preview",
      category: "Navigation",
      title: "13. Artifact Previewer",
      description: "Full markdown/code viewer with copy and download controls",
      icon: <Code2 className="h-4 w-4 text-amber-500" />,
      action: () => {
        onNavigate("artifact_preview");
        onClose();
      },
    },
    {
      id: "nav-project-intel",
      category: "Navigation",
      title: "14. Project Intelligence",
      description: "Analyze package manifests (package.json, Cargo.toml) to pin docs",
      icon: <Box className="h-4 w-4 text-cyan-500" />,
      action: () => {
        onNavigate("project_intel");
        onClose();
      },
    },
    {
      id: "nav-mcp",
      category: "Navigation",
      title: "15. MCP Server Workbench",
      description: "Model Context Protocol tools, schema viewer & Cursor/Claude integration",
      icon: <Sparkles className="h-4 w-4 text-yellow-500" />,
      action: () => {
        onNavigate("mcp");
        onClose();
      },
    },
    {
      id: "nav-cli",
      category: "Navigation",
      title: "16. CLI & Local Runtime",
      description: "Rust devknowledge CLI commands, offline SQLite cache & local sync",
      icon: <Terminal className="h-4 w-4 text-slate-400" />,
      action: () => {
        onNavigate("cli");
        onClose();
      },
    },
    {
      id: "nav-health",
      category: "Navigation",
      title: "17. System Health & Telemetry",
      description: "Postgres pool metrics, Cloudflare Workers status & storage quotas",
      icon: <HeartPulse className="h-4 w-4 text-rose-500" />,
      action: () => {
        onNavigate("health");
        onClose();
      },
    },
    {
      id: "nav-settings",
      category: "Navigation",
      title: "18. Workstation Settings",
      description: "API keys, storage toggles, runner authentication and theme settings",
      icon: <Settings className="h-4 w-4 text-slate-400" />,
      action: () => {
        onNavigate("settings");
        onClose();
      },
    },

    // Actions
    {
      id: "action-sweep",
      category: "Discovery & Ingestion",
      title: "Trigger Full Discovery Sweep",
      description: "Scan Crates.io, PyPI, and npm registries for new candidate documentation",
      icon: <Compass className="h-4 w-4 text-indigo-500" />,
      action: () => {
        onTriggerSweep?.();
        onClose();
      },
    },
    {
      id: "action-sync-tokio",
      category: "Sources",
      title: "Sync Tokio Documentation",
      description: "Enqueue immediate incremental crawl for Tokio 1.38.0",
      icon: <RefreshCw className="h-4 w-4 text-blue-500" />,
      action: () => {
        onTriggerSync?.("Tokio");
        onClose();
      },
    },
    {
      id: "action-sync-fastapi",
      category: "Sources",
      title: "Sync FastAPI Documentation",
      description: "Enqueue immediate incremental crawl for FastAPI 0.111.0",
      icon: <RefreshCw className="h-4 w-4 text-blue-500" />,
      action: () => {
        onTriggerSync?.("FastAPI");
        onClose();
      },
    },
  ];

  const filteredItems = commandItems.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  // Handle arrow keys and Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 lg:p-20 bg-slate-950/60 backdrop-blur-xs transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="DevKnowledge Command Palette"
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0c101d] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-slate-200 px-4 dark:border-slate-800">
          <Search className="h-4 w-4 text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all 18 views, sources, actions, or tools... (e.g. 'mcp', 'jobs', 'sync')"
            className="h-13 w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden dark:text-slate-100"
            role="combobox"
            aria-expanded={filteredItems.length > 0}
            aria-controls="command-list"
          />
          <kbd className="hidden sm:inline-flex rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          id="command-list"
          role="listbox"
          className="max-h-96 overflow-y-auto p-2 space-y-1"
        >
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
              No matching commands or navigation routes for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  id={`item-${item.id}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex cursor-pointer items-center justify-between rounded-lg p-2.5 text-xs transition ${
                    isSelected
                      ? "bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                        isSelected
                          ? "border-blue-200 bg-white dark:border-blue-800 dark:bg-blue-900/50"
                          : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate text-slate-900 dark:text-slate-100">
                        {item.title}
                      </div>
                      <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight className="h-3.5 w-3.5 text-blue-500" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-mono text-slate-500 dark:border-slate-800 dark:bg-[#090d18] dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="text-[10px]">18 Workstation Modules Registered</span>
        </div>
      </div>
    </div>
  );
}
