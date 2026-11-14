import React from "react";
import { BookOpen, Search, Terminal, Cpu } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight">DevKnowledge</span>
            <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              v1.0
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <a href="#sources" className="flex items-center gap-1.5 hover:text-blue-600">
            <BookOpen className="h-4 w-4" />
            Sources
          </a>
          <a href="#search" className="flex items-center gap-1.5 hover:text-blue-600">
            <Search className="h-4 w-4" />
            Search
          </a>
          <a href="#cli" className="flex items-center gap-1.5 hover:text-blue-600">
            <Terminal className="h-4 w-4" />
            CLI & MCP
          </a>
        </nav>
      </div>
    </header>
  );
}
