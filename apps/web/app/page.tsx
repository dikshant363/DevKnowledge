"use client";

import React, { useState, useEffect } from "react";
import { NavigationShell, ActiveTab } from "@/components/NavigationShell";
import { CommandPalette } from "@/components/CommandPalette";
import { DashboardOverview } from "@/components/DashboardOverview";
import { SourceRegistry } from "@/components/SourceRegistry";
import { SourceRegistration } from "@/components/SourceRegistration";
import { SourceDetails } from "@/components/SourceDetails";
import { DiscoveryCenter } from "@/components/DiscoveryCenter";
import { DiscoveryReviewQueue } from "@/components/DiscoveryReviewQueue";
import { TechnologyCatalog } from "@/components/TechnologyCatalog";
import { JobMonitor } from "@/components/JobMonitor";
import { JobDetails } from "@/components/JobDetails";
import { SynchronizationView } from "@/components/SynchronizationView";
import { SearchExplorer } from "@/components/SearchExplorer";
import { ArtifactViewer } from "@/components/ArtifactViewer";
import { ArtifactPreview } from "@/components/ArtifactPreview";
import { ProjectIntelligence } from "@/components/ProjectIntelligence";
import { McpIntegration } from "@/components/McpIntegration";
import { CliRuntime } from "@/components/CliRuntime";
import { SystemHealth } from "@/components/SystemHealth";
import { SettingsView } from "@/components/SettingsView";
import { ShieldCheck, Cpu, Terminal } from "lucide-react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [selectedSourceId, setSelectedSourceId] = useState<string | undefined>(undefined);
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(undefined);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | undefined>(undefined);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isDispatching, setIsDispatching] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync dark class on mount and change
  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const handleToggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Command Palette trigger (Cmd+K or Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Check if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        isCommandPaletteOpen
      ) {
        return;
      }

      // Fast view switching keys 1-6
      if (e.key === "1") setActiveTab("overview");
      else if (e.key === "2") setActiveTab("sources");
      else if (e.key === "3") setActiveTab("discovery");
      else if (e.key === "4") setActiveTab("jobs");
      else if (e.key === "5") setActiveTab("artifacts");
      else if (e.key === "6") setActiveTab("search");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommandPaletteOpen]);

  // Cloudflare Worker dispatch trigger
  const handleManualDispatch = () => {
    setIsDispatching(true);
    setToastMessage("Dispatched crawler execution to GitHub Actions runner.");

    setTimeout(() => {
      setIsDispatching(false);
      setTimeout(() => setToastMessage(null), 3500);
    }, 2000);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-[#070a12] dark:text-slate-100 transition-colors">
      {/* Global Navigation Shell with all 18 views */}
      <NavigationShell
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        onManualDispatch={handleManualDispatch}
        isDispatching={isDispatching}
      />

      {/* Main Container across 375px, 430px, 768px, 1024px, 1440px, 1920px */}
      <main className="flex-1 w-full max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-8 py-5">
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 rounded-lg border border-blue-200 bg-blue-50/90 p-3 text-xs font-semibold text-blue-900 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300 flex items-center justify-between"
          >
            <span>{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-200 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 18 Tab Panels */}
        <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
          {/* 1. Overview */}
          {activeTab === "overview" && (
            <DashboardOverview
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
              onQuickIndexUrl={(url) => {
                setToastMessage(`Ingestion pipeline queued for ${url}`);
                setTimeout(() => setToastMessage(null), 4000);
              }}
            />
          )}

          {/* 2. Sources Registry */}
          {activeTab === "sources" && (
            <SourceRegistry
              onTriggerSync={(name) => {
                setToastMessage(`Sync enqueued for ${name}`);
                setTimeout(() => setToastMessage(null), 3000);
              }}
              onNavigate={(tab, id) => {
                if (id) setSelectedSourceId(id);
                setActiveTab(tab);
              }}
            />
          )}

          {/* 3. Register Source */}
          {activeTab === "register_source" && (
            <SourceRegistration
              onNavigate={(tab, id) => {
                if (id) setSelectedSourceId(id);
                setActiveTab(tab);
              }}
              onRegistered={(name) => {
                setToastMessage(`Source '${name}' successfully registered!`);
                setTimeout(() => setToastMessage(null), 3000);
              }}
            />
          )}

          {/* 4. Source Details */}
          {activeTab === "source_details" && (
            <SourceDetails
              sourceId={selectedSourceId}
              onNavigate={(tab, id) => {
                if (id) setSelectedSourceId(id);
                setActiveTab(tab);
              }}
              onTriggerSync={(name) => {
                setToastMessage(`Incremental sync queued for ${name}`);
                setTimeout(() => setToastMessage(null), 3000);
              }}
            />
          )}

          {/* 5. Automatic Discovery */}
          {activeTab === "discovery" && (
            <DiscoveryCenter
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {/* 6. Discovery Review Queue */}
          {activeTab === "discovery_review" && (
            <DiscoveryReviewQueue
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {/* 7. Technology Catalog */}
          {activeTab === "technologies" && (
            <TechnologyCatalog
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {/* 8. Crawler Jobs */}
          {activeTab === "jobs" && (
            <JobMonitor
              onNavigate={(tab, id) => {
                if (id) setSelectedJobId(id);
                setActiveTab(tab);
              }}
            />
          )}

          {/* 9. Job Details & Logs */}
          {activeTab === "job_details" && (
            <JobDetails
              jobId={selectedJobId}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {/* 10. Synchronization Policies */}
          {activeTab === "sync" && (
            <SynchronizationView
              onManualDispatch={handleManualDispatch}
              isDispatching={isDispatching}
            />
          )}

          {/* 11. Search Explorer */}
          {activeTab === "search" && <SearchExplorer />}

          {/* 12. Artifacts (CKR) */}
          {activeTab === "artifacts" && (
            <ArtifactViewer
              onNavigate={(tab, id) => {
                if (id) setSelectedArtifactId(id);
                setActiveTab(tab);
              }}
            />
          )}

          {/* 13. Artifact Preview */}
          {activeTab === "artifact_preview" && (
            <ArtifactPreview
              artifactId={selectedArtifactId}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {/* 14. Project Intelligence */}
          {activeTab === "project_intel" && (
            <ProjectIntelligence
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {/* 15. MCP Server */}
          {activeTab === "mcp" && (
            <McpIntegration
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {/* 16. CLI & Local Runtime */}
          {activeTab === "cli" && (
            <CliRuntime
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {/* 17. System Health */}
          {activeTab === "health" && (
            <SystemHealth
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {/* 18. Settings */}
          {activeTab === "settings" && (
            <SettingsView
              isDark={isDark}
              onToggleTheme={handleToggleTheme}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}
        </div>
      </main>

      {/* Global Command Palette Dialog */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(tab) => setActiveTab(tab)}
        onTriggerSweep={() => {
          setToastMessage("Triggered autonomous discovery sweep across package registries.");
          setTimeout(() => setToastMessage(null), 3000);
        }}
        onTriggerSync={(sourceName) => {
          setToastMessage(`Manual crawl queued for ${sourceName}`);
          setTimeout(() => setToastMessage(null), 3000);
        }}
      />

      {/* High-Density Workstation Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white/70 py-4 text-xs dark:border-slate-800 dark:bg-[#070a12]/80 transition-colors">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 px-3 sm:px-4 lg:px-8 sm:flex-row sm:items-center sm:justify-between text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <Cpu className="h-3.5 w-3.5 text-blue-500" />
              <span>DevKnowledge Workstation</span>
            </div>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
            <span className="font-mono text-[11px]">Meta Astryx Design System</span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              Zero-Egress Caching (₹0/mo)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono">
            <span>Shortcuts: ⌘K (Palette), 1-6 (Views)</span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
            <span>WCAG 2.1 AAA Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
