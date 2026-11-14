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

export type ActiveTab =
  | "overview"
  | "sources"
  | "register_source"
  | "source_details"
  | "discovery"
  | "discovery_review"
  | "technologies"
  | "jobs"
  | "job_details"
  | "sync"
  | "search"
  | "artifacts"
  | "artifact_preview"
  | "project_intel"
  | "mcp"
  | "cli"
  | "health"
  | "settings";

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

  // Group definitions for high-density multi-view layout
  const navClusters = [
    {
      name: "Core",
      tabs: [
        { id: "overview" as ActiveTab, label: "Overview", icon: <Activity className="h-3.5 w-3.5" /> },
      ],
    },
    {
      name: "Sources",
      tabs: [
        { id: "sources" as ActiveTab, label: "All Sources", icon: <BookOpen className="h-3.5 w-3.5" /> },
        { id: "register_source" as ActiveTab, label: "Register Source", icon: <PlusCircle className="h-3.5 w-3.5" /> },
        { id: "source_details" as ActiveTab, label: "Source Details", icon: <FileSearch className="h-3.5 w-3.5" /> },
      ],
    },
    {
      name: "Discovery",
      tabs: [
        { id: "discovery" as ActiveTab, label: "Discovery Sweeps", icon: <Compass className="h-3.5 w-3.5" /> },
        { id: "discovery_review" as ActiveTab, label: "Review Queue", icon: <CheckSquare className="h-3.5 w-3.5" /> },
        { id: "technologies" as ActiveTab, label: "Technology Catalog", icon: <Network className="h-3.5 w-3.5" /> },
      ],
    },
    {
      name: "Ingestion & Sync",
      tabs: [
        { id: "jobs" as ActiveTab, label: "Crawl Jobs", icon: <Layers className="h-3.5 w-3.5" /> },
        { id: "job_details" as ActiveTab, label: "Logs & Diagnosis", icon: <FileCode className="h-3.5 w-3.5" /> },
        { id: "sync" as ActiveTab, label: "Sync Policies", icon: <Clock className="h-3.5 w-3.5" /> },
      ],
    },
    {
      name: "Knowledge",
      tabs: [
        { id: "search" as ActiveTab, label: "Search Explorer", icon: <Search className="h-3.5 w-3.5" /> },
        { id: "artifacts" as ActiveTab, label: "Artifacts (CKR)", icon: <Database className="h-3.5 w-3.5" /> },
        { id: "artifact_preview" as ActiveTab, label: "Artifact Preview", icon: <Code2 className="h-3.5 w-3.5" /> },
      ],
    },
    {
      name: "Agents & System",
      tabs: [
        { id: "project_intel" as ActiveTab, label: "Project Intel", icon: <Box className="h-3.5 w-3.5" /> },
        { id: "mcp" as ActiveTab, label: "MCP Server", icon: <Sparkles className="h-3.5 w-3.5" /> },
        { id: "cli" as ActiveTab, label: "CLI & Local", icon: <Terminal className="h-3.5 w-3.5" /> },
        { id: "health" as ActiveTab, label: "System Health", icon: <HeartPulse className="h-3.5 w-3.5" /> },
        { id: "settings" as ActiveTab, label: "Settings", icon: <Settings className="h-3.5 w-3.5" /> },
      ],
    },
  ];

  const getBreadcrumb = () => {
    switch (activeTab) {
      case "overview":
        return "Workstation / System Telemetry & Health";
      case "sources":
        return "Sources / Official Registry";
      case "register_source":
        return "Sources / Register New Documentation";
      case "source_details":
        return "Sources / Snapshots & Page Inspector";
      case "discovery":
        return "Discovery / Universal Automated Sweeps";
      case "discovery_review":
        return "Discovery / Official Candidate Review Queue";
      case "technologies":
        return "Discovery / Hierarchical Technology Catalog";
      case "jobs":
        return "Ingestion / Durable Crawler Job Monitor";
      case "job_details":
        return "Ingestion / Live Execution Logs & Retry";
      case "sync":
        return "Ingestion / Cloudflare Worker Sync Policies";
      case "search":
        return "Knowledge / Hybrid Semantic Search Workbench";
      case "artifacts":
        return "Knowledge / Canonical Knowledge Repository (CKR)";
      case "artifact_preview":
        return "Knowledge / Compiled Artifact Inspector";
      case "project_intel":
        return "Agents / Dependency Analysis & Pinned Knowledge";
      case "mcp":
        return "Agents / Model Context Protocol (10 Tools)";
      case "cli":
        return "Agents / Rust CLI & Local Offline Cache";
      case "health":
        return "System / Telemetry, Database & Quota Guards";
      case "settings":
        return "System / API Keys & Workstation Configuration";
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs shadow-blue-500/20">
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
            <span className="font-mono">Supabase PostgreSQL 17 Connected</span>
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex items-center gap-2">
          {/* Global Search / Command Palette Trigger */}
          <button
            onClick={onOpenCommandPalette}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 transition astryx-focus"
            aria-label="Search or trigger command palette (Cmd+K)"
          >
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden md:inline">Command Palette</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.2 text-[10px] font-mono text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              ⌘K
            </kbd>
          </button>

          {/* Manual Crawler Dispatch Action */}
          {onManualDispatch && (
            <button
              onClick={onManualDispatch}
              disabled={isDispatching}
              className="hidden lg:inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60 transition disabled:opacity-50 astryx-focus"
              title="Dispatch crawler synchronization job"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isDispatching ? "animate-spin text-blue-600" : ""}`} />
              <span>{isDispatching ? "Dispatching..." : "Sync Due"}</span>
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition astryx-focus"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 lg:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 astryx-focus"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Cluster Navigation Bar (Astryx Technical Sub-bar) */}
      <div className="border-t border-slate-100 bg-slate-50/70 dark:border-slate-800/80 dark:bg-[#070a12]/80 px-3 sm:px-4 lg:px-8 py-1.5 overflow-x-auto">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4">
          {/* Scrollable View Tabs */}
          <div className="flex items-center gap-1">
            {navClusters.map((cluster) => (
              <div key={cluster.name} className="flex items-center gap-1 border-r border-slate-200/80 dark:border-slate-800 pr-2 mr-2 last:border-r-0 last:pr-0 last:mr-0">
                <span className="hidden xl:inline text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 select-none">
                  {cluster.name}:
                </span>
                {cluster.tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => onTabChange(tab.id)}
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition astryx-focus ${
                        isActive
                          ? "bg-white text-blue-600 shadow-2xs font-semibold dark:bg-slate-800 dark:text-blue-400 border border-slate-200/80 dark:border-slate-700"
                          : "text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Breadcrumb Display */}
          <div className="hidden 2xl:flex items-center gap-1.5 text-[11px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
            <span>{getBreadcrumb()}</span>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (Accessible overlay) */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900 lg:hidden max-h-[80vh] overflow-y-auto">
          <div className="space-y-4">
            {navClusters.map((cluster) => (
              <div key={cluster.name} className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2">
                  {cluster.name}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {cluster.tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          onTabChange(tab.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                          isActive
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >
                        {tab.icon}
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
