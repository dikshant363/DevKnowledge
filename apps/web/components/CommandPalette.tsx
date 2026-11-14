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
} from "lucide-react";
import { ActiveTab } from "./NavigationShell";

export interface CommandItem {
  id: string;
  category: "Navigation" | "Sources" | "System Operations";
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
    {
      id: "nav-overview",
      category: "Navigation",
      title: "Jump to Overview Dashboard",
      description: "System telemetry, worker health, document metrics & activity stream",
      icon: <Activity className="h-4 w-4 text-blue-500" />,
      shortcut: "1",
      action: () => {
        onNavigate("overview");
        onClose();
      },
    },
    {
      id: "nav-sources",
      category: "Navigation",
      title: "Open Source Registry",
      description: "Manage tracked documentation websites, version pins & SSRF checks",
      icon: <BookOpen className="h-4 w-4 text-emerald-500" />,
      shortcut: "2",
      action: () => {
        onNavigate("sources");
        onClose();
      },
    },
    {
      id: "nav-discovery",
      category: "Navigation",
      title: "Open Discovery Center",
      description: "Autonomous source discovery, provider quotas & candidate review queue",
      icon: <Compass className="h-4 w-4 text-indigo-500" />,
      shortcut: "3",
      action: () => {
        onNavigate("discovery");
        onClose();
      },
    },
    {
      id: "nav-jobs",
      category: "Navigation",
      title: "Open Job Monitor",
      description: "Inspect crawler queues, 6-stage pipeline progress & live worker logs",
      icon: <Layers className="h-4 w-4 text-purple-500" />,
      shortcut: "4",
      action: () => {
        onNavigate("jobs");
        onClose();
      },
    },
    {
      id: "nav-artifacts",
      category: "Navigation",
      title: "Inspect CKR Artifacts",
      description: "Canonical Knowledge Repository bundles, JSON schema & markdown preview",
      icon: <Database className="h-4 w-4 text-amber-500" />,
      shortcut: "5",
      action: () => {
        onNavigate("artifacts");
        onClose();
      },
    },
    {
      id: "nav-search",
      category: "Navigation",
      title: "Open Search Explorer",
      description: "Execute full-text, semantic and symbol queries with citation links",
      icon: <Search className="h-4 w-4 text-sky-500" />,
      shortcut: "6",
      action: () => {
        onNavigate("search");
        onClose();
      },
    },
    {
      id: "sync-tokio",
      category: "Sources",
      title: "Sync Tokio (docs.rs/tokio)",
      description: "Trigger immediate crawl & CKR compilation for Tokio v1.38.0",
      icon: <RefreshCw className="h-4 w-4 text-emerald-500" />,
      action: () => {
        onTriggerSync?.("Tokio");
        onNavigate("jobs");
        onClose();
      },
    },
    {
      id: "sync-axum",
      category: "Sources",
      title: "Sync Axum (docs.rs/axum)",
      description: "Re-validate sitemaps and update Axum web framework documentation",
      icon: <RefreshCw className="h-4 w-4 text-emerald-500" />,
      action: () => {
        onTriggerSync?.("Axum");
        onNavigate("jobs");
        onClose();
      },
    },
    {
      id: "sync-fastapi",
      category: "Sources",
      title: "Sync FastAPI (fastapi.tiangolo.com)",
      description: "Check upstream ETags and compile latest OpenAPI/FastAPI references",
      icon: <RefreshCw className="h-4 w-4 text-indigo-500" />,
      action: () => {
        onTriggerSync?.("FastAPI");
        onNavigate("jobs");
        onClose();
      },
    },
    {
      id: "op-sweep",
      category: "System Operations",
      title: "Run Universal Discovery Sweep",
      description: "Scan Package Registries, Foundation Directories, and GitHub APIs",
      icon: <Compass className="h-4 w-4 text-indigo-500" />,
      action: () => {
        onTriggerSweep?.();
        onNavigate("discovery");
        onClose();
      },
    },
    {
      id: "op-sqlite",
      category: "System Operations",
      title: "Inspect SQLite Offline Cache",
      description: "Verify local database cache at devknowledge.db (320 KB active)",
      icon: <Terminal className="h-4 w-4 text-amber-500" />,
      action: () => {
        onNavigate("artifacts");
        onClose();
      },
    },
    {
      id: "op-ssrf",
      category: "System Operations",
      title: "Test SSRF Pre-flight Hardening",
      description: "Run DNS resolution checks against private subnets (127.0.0.1, 10.0.0.0/8, 169.254.169.254)",
      icon: <ShieldAlert className="h-4 w-4 text-rose-500" />,
      action: () => {
        onNavigate("sources");
        onClose();
      },
    },
  ];

  const filteredItems = commandItems.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filteredItems.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault();
      filteredItems[selectedIndex].action();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Workstation Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700/80 dark:bg-[#0f172a] transition-all"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, source, or view name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-slate-100"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
            >
              Clear
            </button>
          )}
          <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[380px] overflow-y-auto p-2 space-y-1"
          role="listbox"
        >
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No matching commands found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-xs transition ${
                    isSelected
                      ? "bg-blue-50 text-blue-900 dark:bg-slate-800 dark:text-blue-100"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-850"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                        isSelected
                          ? "border-blue-200 bg-white dark:border-blue-900 dark:bg-slate-900"
                          : "border-slate-200 bg-slate-100/60 dark:border-slate-800 dark:bg-slate-900"
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">{item.title}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-mono text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {item.category}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500 truncate dark:text-slate-400">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.shortcut && (
                      <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                        {item.shortcut}
                      </kbd>
                    )}
                    <ArrowRight
                      className={`h-3.5 w-3.5 ${
                        isSelected ? "text-blue-600 dark:text-blue-400" : "text-transparent"
                      }`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Keyboard Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1 py-0.2 font-mono text-[9px] dark:border-slate-700 dark:bg-slate-800">
                ↑
              </kbd>
              <kbd className="rounded border border-slate-200 bg-white px-1 py-0.2 font-mono text-[9px] dark:border-slate-700 dark:bg-slate-800">
                ↓
              </kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1 py-0.2 font-mono text-[9px] dark:border-slate-700 dark:bg-slate-800">
                ↵
              </kbd>
              <span>to select</span>
            </span>
          </div>
          <span>Meta Astryx Command Hub</span>
        </div>
      </div>
    </div>
  );
}
