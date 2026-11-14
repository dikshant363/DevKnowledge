"use client";

import React, { useState } from "react";
import {
  Cpu,
  Search,
  BookOpen,
  Compass,
  Activity,
  Layers,
  Database,
  Terminal,
  Sun,
  Moon,
  Menu,
  X,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export type ActiveTab = "overview" | "sources" | "discovery" | "jobs" | "artifacts" | "search";

interface NavigationShellProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenCommandPalette: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onManualDispatch?: () => void;
  isDispatching?: boolean;
}

export function NavigationShell({
  activeTab,
  onTabChange,
  onOpenCommandPalette,
  isDark,
  onToggleTheme,
  onManualDispatch,
  isDispatching = false,
}: NavigationShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: "overview", label: "Overview", icon: <Activity className="h-4 w-4" />, shortcut: "1" },
    { id: "sources", label: "Source Registry", icon: <BookOpen className="h-4 w-4" />, shortcut: "2" },
    { id: "discovery", label: "Discovery Center", icon: <Compass className="h-4 w-4" />, shortcut: "3" },
    { id: "jobs", label: "Job Monitor", icon: <Layers className="h-4 w-4" />, shortcut: "4" },
    { id: "artifacts", label: "Artifacts (CKR)", icon: <Database className="h-4 w-4" />, shortcut: "5" },
    { id: "search", label: "Search Explorer", icon: <Search className="h-4 w-4" />, shortcut: "6" },
  ];

  const getBreadcrumb = () => {
    switch (activeTab) {
      case "overview":
        return "Workstation / System Telemetry & Health";
      case "sources":
        return "Workstation / Source Registry (SSRF Hardened)";
      case "discovery":
        return "Workstation / Universal Discovery Center";
      case "jobs":
        return "Workstation / Ingestion & Compilation Pipeline Queue";
      case "artifacts":
        return "Workstation / Canonical Knowledge Repository (CKR)";
      case "search":
        return "Workstation / Developer Semantic Search Workbench";
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-[#070a12]/95 transition-colors">
      {/* Primary Top Bar */}
      <div className="mx-auto flex h-14 max-w-[1800px] items-center justify-between px-3 sm:px-4 lg:px-8">
        {/* Brand & Live Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onTabChange("overview")}
            className="flex items-center gap-2.5 rounded-lg p-1 text-left astryx-focus"
            aria-label="DevKnowledge Home"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-500/20">
              <Cpu className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100">
                  DevKnowledge
                </span>
                <span className="hidden sm:inline-block rounded border border-slate-200 bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  v1.0.0
                </span>
              </div>
            </div>
          </button>

          {/* Engine Status Pill */}
          <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span>Cloudflare + Supabase (₹0/mo tier active)</span>
          </div>
        </div>

        {/* Center: Command Palette Trigger */}
        <div className="flex-1 max-w-md mx-2 sm:mx-4">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="group flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-850 astryx-focus"
            aria-label="Open Command Palette (Press Command K)"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
              <span className="truncate">Search sources, symbols, or jump to view...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {onManualDispatch && (
            <button
              onClick={onManualDispatch}
              disabled={isDispatching}
              className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition astryx-focus"
              title="Trigger GitHub Actions Crawler Workflow"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isDispatching ? "animate-spin text-blue-500" : ""}`} />
              <span>{isDispatching ? "Dispatching..." : "Sync Runner"}</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition astryx-focus"
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            title={isDark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 astryx-focus"
            aria-label="Toggle Mobile Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Primary Tab Navigation (Desktop / Tablet) */}
      <div className="hidden md:block border-t border-slate-200/80 bg-slate-50/50 px-3 sm:px-4 lg:px-8 dark:border-slate-850 dark:bg-[#070a12]/80">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between">
          <nav
            role="tablist"
            aria-label="Workstation View Tabs"
            className="flex items-center gap-1 py-1.5"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => onTabChange(tab.id)}
                  className={`group flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-white text-blue-600 shadow-xs border border-slate-200/80 dark:border-slate-700/60 dark:bg-slate-800 dark:text-blue-400"
                      : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                  } astryx-focus`}
                >
                  <span className={isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                  <span
                    className={`ml-1 rounded px-1 text-[9px] font-mono ${
                      isActive
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300"
                        : "bg-slate-200/60 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {tab.shortcut}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Breadcrumb & Telemetry Info */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-mono text-slate-400 dark:text-slate-500">{getBreadcrumb()}</span>
            <span className="h-3 w-px bg-slate-300 dark:bg-slate-700" />
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-mono">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              SSRF Hardened
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (375px & 430px viewports) */}
      {mobileMenuOpen && (
        <div
          role="region"
          aria-label="Mobile Navigation"
          className="md:hidden border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#070a12] space-y-1"
        >
          <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Workstation Views
          </div>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold ${
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-slate-850 dark:text-blue-400"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                } astryx-focus`}
              >
                <div className="flex items-center gap-2">
                  {tab.icon}
                  <span>{tab.label}</span>
                </div>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-slate-800">
                  {tab.shortcut}
                </span>
              </button>
            );
          })}

          <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
            {onManualDispatch && (
              <button
                onClick={() => {
                  onManualDispatch();
                  setMobileMenuOpen(false);
                }}
                disabled={isDispatching}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-xs font-semibold dark:border-slate-700 astryx-focus"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isDispatching ? "animate-spin text-blue-500" : ""}`} />
                {isDispatching ? "Dispatching..." : "Sync Runner (GitHub Actions)"}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
