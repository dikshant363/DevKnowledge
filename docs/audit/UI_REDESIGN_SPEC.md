# Meta Astryx-Inspired Frontend Redesign & Accessibility Specification
**System**: DevKnowledge Web Workstation (`apps/web`)  
**Phase**: Phase D — UI Redesign & Accessibility Overhaul  
**Target Design Philosophy**: Meta Astryx (Technical Minimalism, High-Density Data, Refined Typography, WCAG AAA/AA Accessibility)  
**Standard Viewports**: 375px, 430px, 768px, 1024px, 1440px, 1920px  

---

## 1. Executive Summary & Design System Vision

The **DevKnowledge Web Workstation** is the central developer interface for indexing, discovering, monitoring, and searching canonical technical documentation for AI coding agents and engineering teams.

Inspired by **Meta Astryx** (`@meta/astryx`, `packages/core`, `packages/themes`), the interface moves away from generic SaaS landing page tropes (excessive gradient blobs, bloated cards, wasted whitespace) toward a **high-density, mission-critical engineering workstation**.

### Core Pillars
1. **Technical Minimalism**: High signal-to-noise ratio. Information takes precedence over decorative illustration.
2. **Refined Dual Typography**: Crisp sans-serif (Inter / System font stack) paired strictly with monospace typography for hashes, URLs, version numbers, API signatures, and terminal output.
3. **Semantic Surface & Border Token Hierarchy**: Multi-layer elevation without blurry drop shadows; separation is achieved via calibrated 1px borders, subtle tint shifts, and sunken/elevated surfaces.
4. **Dark & Light Mode Parity**: Native tokenized dark theme (deep slate/carbon `950` base, high contrast text) and clean high-contrast light theme.
5. **Keyboard-First Workstation Flow**: Global Command Palette (`Cmd+K` / `Ctrl+K`), quick view switcher shortcuts (`1`-`6`), tab cycling, and Esc to dismiss modals.
6. **High-Density Engineering Layouts**: Compact data tables, status matrices, side-by-side artifact inspectors, live job step execution rails, and responsive flex/grid adaptations.
7. **Strict Accessibility (WCAG 2.1 AA/AAA)**: Explicit focus rings (`focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none`), ARIA labels, semantic roles (`role="dialog"`, `role="tab"`, `role="status"`), color contrast &ge; 4.5:1 for normal text and &ge; 3:1 for graphical indicators.

---

## 2. Design Token Architecture

### 2.1 Color Tokens & Semantic Palettes

| Token | Light Theme Value | Dark Theme Value | Usage |
| :--- | :--- | :--- | :--- |
| `surface-canvas` | `#f8fafc` (`slate-50`) | `#070a12` (`slate-950/deep`) | Workstation root canvas |
| `surface-panel` | `#ffffff` (`white`) | `#0f172a` (`slate-900`) | Cards, tables, inspectors, sidebars |
| `surface-elevated` | `#ffffff` (crisp border) | `#172033` (`slate-850`) | Command palette, modals, floating popovers |
| `surface-subtle` | `#f1f5f9` (`slate-100`) | `#0a0f1d` (`slate-950/80`) | Table headers, inset rails, code backgrounds |
| `surface-hover` | `#e2e8f0` (`slate-200/60`) | `#1e293b` (`slate-800/60`) | Row hover, list item hover |
| `border-subtle` | `#e2e8f0` (`slate-200`) | `#1e293b` (`slate-800`) | Card borders, table dividers, panel splitters |
| `border-default` | `#cbd5e1` (`slate-300`) | `#334155` (`slate-700`) | Interactive element borders, active tabs |
| `border-strong` | `#94a3b8` (`slate-400`) | `#475569` (`slate-600`) | Selected inputs, highlighted active rows |
| `border-focus` | `#2563eb` (`blue-600`) | `#3b82f6` (`blue-500`) | 2px accessible focus ring with offset |
| `text-primary` | `#0f172a` (`slate-900`) | `#f8fafc` (`slate-50`) | Primary headlines, data titles, active labels |
| `text-secondary` | `#475569` (`slate-600`) | `#94a3b8` (`slate-400`) | Descriptions, subtitles, table column headers |
| `text-muted` | `#64748b` (`slate-500`) | `#64748b` (`slate-500`) | Timestamps, metadata keys, secondary notes |
| `text-mono` | `#1e293b` (`slate-800`) | `#cbd5e1` (`slate-300`) | Hashes, URLs, code blocks, parameters |

### 2.2 Semantic Status Accents

| State | Foreground Light | Background Light | Foreground Dark | Background Dark | Indicator Dot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Operational / Verified** | `#047857` (`emerald-700`) | `#ecfdf5` (`emerald-50`) | `#34d399` (`emerald-400`) | `#064e3b/60` | `#10b981` (pulsing) |
| **Active / Running** | `#1d4ed8` (`blue-700`) | `#eff6ff` (`blue-50`) | `#60a5fa` (`blue-400`) | `#1e3a8a/60` | `#3b82f6` (spinning) |
| **Warning / Review** | `#b45309` (`amber-700`) | `#fffbeb` (`amber-50`) | `#fbbf24` (`amber-400`) | `#78350f/60` | `#f59e0b` (steady) |
| **Critical / Failed** | `#be123c` (`rose-700`) | `#fff1f2` (`rose-50`) | `#fb7185` (`rose-400`) | `#881337/60` | `#f43f5e` (alert) |
| **Neutral / Idle** | `#475569` (`slate-600`) | `#f1f5f9` (`slate-100`) | `#94a3b8` (`slate-400`) | `#1e293b/60` | `#64748b` (muted) |

### 2.3 Typography Scale

- **Display Title (Workstation Header)**: `24px` / `1.25` line-height / `font-bold` / `tracking-tight`
- **Section Heading**: `16px` / `1.3` line-height / `font-semibold`
- **Subheading / Panel Title**: `14px` / `1.4` line-height / `font-semibold`
- **Body Text**: `13px` / `1.5` line-height / `font-normal`
- **Compact UI / Table Cell**: `12px` / `1.4` line-height / `font-medium`
- **Micro Badges / Pill Tags**: `10px` / `1.2` line-height / `font-semibold` / `uppercase` / `tracking-wider`
- **Code / Monospace**: `11px` - `12px` / `font-mono` (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`)

---

## 3. Screen-by-Screen Component Architecture

The workstation is refactored into a high-density, tabbed view structure backed by the **Global Navigation Shell** and **Command Palette**.

### 3.1 Component 1: Global Navigation Shell (`NavigationShell.tsx`)
- **Top Bar**:
  - Brand identity: `DevKnowledge` glyph + live version pill (`v1.0.0-production`).
  - Active environment badge (`Live Engine: Cloudflare + Supabase`, status dot `Operational`).
  - Command Palette trigger button (`⌘K` / `Ctrl+K`) with icon and shortcut hint.
  - Active view tabs with icons and keyboard shortcut badges (`1: Overview`, `2: Sources`, `3: Discovery`, `4: Jobs`, `5: Artifacts`, `6: Search`).
  - Quick action cluster: Manual Crawl Dispatch, Docs permalink, Theme toggle (Dark / Light).
- **Sub-Header Status Bar**:
  - High-density breadcrumb trail showing current view path (`Workstation > Source Registry > Tokio (v1.38.0)`).
  - Quick metrics ticker: `8 Sources` • `1,420 Documents` • `2.4M Tokens` • `0 Sync Errors` • `Free Tier: ₹0/mo`.

### 3.2 Component 2: Command Palette Modal (`CommandPalette.tsx`)
- **Trigger**: `Cmd+K`, `Ctrl+K`, or click on the search bar in the global navigation shell.
- **Features**:
  - Fuzzy-search input with instant focus.
  - Action categories:
    - **Navigation**: Switch to Overview, Source Registry, Discovery Center, Job Monitor, Artifact Viewer, Search Explorer.
    - **Source Quick Actions**: Trigger manual sync for Tokio, Axum, SwiftUI, FastAPI, Jetpack Compose.
    - **System Operations**: Run discovery sweep, export SQLite database cache, download CKR bundle, test SSRF crawler.
  - Keyboard navigation: `ArrowUp`, `ArrowDown`, `Enter` to select, `Esc` to close.
  - Accessibility: `role="dialog"`, `aria-modal="true"`, `aria-label="Workstation Command Palette"`, `trapFocus`.

### 3.3 Component 3: Dashboard Overview (`DashboardOverview.tsx`)
- **System Metrics Grid (4-up high density)**:
  - Total Sources Tracked (with delta and official verification ratio).
  - Total Canonical Documents & Code Snippets.
  - Active / Completed Pipeline Jobs with 100% success rate tracker.
  - API & MCP Gateway Throughput (request count and latency average `18ms`).
- **Engine Health & Cloud Infrastructure Cards**:
  - Cloudflare Worker Gateway status (`₹0/mo tier`, max 50ms CPU safeguard).
  - Supabase PostgreSQL storage & vector pool status.
  - MCP Agent connectivity status (Local stdio & Claude/Cursor/Antigravity bridge).
  - Local SQLite Cache sync status.
- **Recent Ingestion Pipeline Activity Stream**:
  - Real-time event log with timestamps, technology badges, status pills, and direct deep-links.

### 3.4 Component 4: Source Registry (`SourceRegistry.tsx`)
- **Source Inventory Table**:
  - Columns: Source Name & Ecosystem, Canonical Root URL, Documentation Type (Crates.io, Official Foundation, PyPI, Apple Developer), Pinned Version, Active Snapshot ID (hash), Sync Status, SSRF Safe Badge, Actions.
  - Search & Category Filter pills (All, Rust, Python, Apple, Android, Cloud/Infra).
  - Row Expansion / Detail Inspector:
    - Slide-out or collapsible row drawer revealing exact robots.txt policy, ETag, last scrape duration, page count, and direct crawl trigger.
- **Add New Source Modal / Inline Form**:
  - Fast URL input with automatic SSRF safety pre-flight check, technology name inference, and registration confirmation.

### 3.5 Component 5: Discovery Center (`DiscoveryCenter.tsx`)
- Astryx-upgraded version of the Universal Documentation Discovery Center.
- Candidate Review Queue:
  - Multi-provider evidence breakdown (Crates.io manifest, Foundation directory, GitHub stars, License).
  - High-density confidence score bar with exact percentage.
  - Instant One-Click Actions: Approve, Reject, Quarantine.
- Autonomous Policy Configuration:
  - Auto-registration threshold slider/toggle (&ge;85% confidence).
  - Blacklist domain tags with fast tag removal and addition.
- Provider Health & Quotas:
  - Real-time gauge bars for 5 discovery providers (Package Registries, Official Directories, GitHub API, Search API, Cross-Reference Engine).

### 3.6 Component 6: Job Monitor (`JobMonitor.tsx`)
- **Live Ingestion & Compilation Pipeline Queue**:
  - Pipeline Visualizer: 6-stage execution tracking:
    1. `DNS Pre-flight & SSRF Validation`
    2. `Robots.txt & Sitemap Fetch`
    3. `Page Crawler & HTML Sanitization`
    4. `Section & Code Snippet Extraction`
    5. `CKR Compilation & Hash Pinning`
    6. `Atomic Snapshot Release`
  - Active & Completed Job Table with duration, records processed, retry counter, and logs button.
  - Expandable Terminal Log Inspector displaying real-time worker logs with syntax highlighting and timestamps.

### 3.7 Component 7: Canonical Knowledge Artifact Viewer (`ArtifactViewer.tsx`)
- **CKR (Canonical Knowledge Repository) Bundle Explorer**:
  - Left Rail: Artifact Manifest Tree (Hierarchical view of technologies -> versions -> snapshots -> sections).
  - Center/Right Pane: Dual Preview:
    - **Structured Markdown View**: Rendered clean docs with syntax-highlighted code blocks, section headers, and API symbol tables.
    - **Raw Canonical JSON View**: Inspect the exact `@devknowledge/canonical-schema` JSON payload (`SectionBlock`, `CodeSnippet`, `APISymbol`).
  - Action Bar: Copy JSON, Export CKR Bundle (`.tar.gz`), View Provenance Hash (`sha256:...`).

### 3.8 Component 8: Search Explorer (`SearchExplorer.tsx`)
- **Interactive Retrieval Workbench**:
  - Multi-mode Search Bar (Full-Text, Semantic Vector, Hybrid).
  - Filters: Technology filter, version selector, symbol type (functions, classes, interfaces, guides).
  - Results Feed with:
    - Confidence / Relevance score pill (`Score: 0.96`).
    - Breadcrumb navigation (`Tokio > Core Concepts > Spawning Tasks`).
    - Matched code snippets with language badges and line numbers.
    - Verified canonical source citation link.
    - Instant Copy for AI Prompt / Agent Context.

---

## 4. Responsive Breakpoint Matrix

The layout utilizes responsive Tailwind classes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) specifically tuned for standard viewport widths:

| Viewport Width | Device Archetype | Navigation Shell | Dashboard Layout | Table & Inspector Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **375px** | iPhone SE, Small Mobile | Collapsed hamburger menu, compact logo | 1 column stacked cards | Horizontal scrollable table with sticky tech column, swipeable cards |
| **430px** | iPhone 15/16 Pro Max | Compact header, mobile drawer | 1 column stacked cards | Compact row formatting, secondary metadata hidden in expandable detail |
| **768px** | iPad mini, Tablet | Compact tab bar with icons | 2 column metrics grid | Multi-column table, condensed action buttons |
| **1024px** | iPad Pro, Compact Laptop | Full tab bar with keyboard hints | 3-4 column metrics grid | Full table with inline action buttons, collapsible sidebar |
| **1440px** | MacBook Pro, Standard Desktop | Full navigation bar + status ticker | 4 column metrics grid | Split-screen dual-rail inspector for Artifact Viewer |
| **1920px** | Workstation Monitor, 4K | Full navigation bar + extended telemetry | 4 column wide metrics grid | Max-width container (`max-w-[1800px]`), full parallel tree and preview panes |

---

## 5. Accessibility & Interaction Polish (WCAG 2.1 AA/AAA)

1. **Focus Rings**: All interactive buttons, inputs, links, and tabs use:
   `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-slate-950`
2. **Keyboard Traps & Shortcuts**:
   - `Cmd+K` / `Ctrl+K`: Opens Command Palette from anywhere.
   - `Escape`: Closes Command Palette, modals, and slide-over inspectors.
   - `Tab` / `Shift+Tab`: Logical focus order through all form fields and action buttons.
3. **Screen Reader Attributes**:
   - `aria-label` on all icon-only buttons (theme toggle, close buttons, external links).
   - `role="dialog"` and `aria-modal="true"` on modals.
   - `role="tablist"`, `role="tab"`, and `aria-selected="true|false"` on view switchers.
   - `role="status"` and `aria-live="polite"` on dynamic counters and notifications.
4. **Color Contrast Guarantee**:
   - Light theme: Text `#0f172a` on `#ffffff` (Contrast ratio: 15.6:1 - WCAG AAA).
   - Dark theme: Text `#f8fafc` on `#0f172a` (Contrast ratio: 15.8:1 - WCAG AAA).
   - Secondary text `#94a3b8` on `#0f172a` (Contrast ratio: 5.4:1 - WCAG AA).
   - Status indicators feature dual encoding: distinct color + icon + text label (never color alone).

---

## 6. Implementation Verification Gates

- [x] Complete design tokens defined in `globals.css` and `tailwind.config.js`.
- [x] Global Navigation Shell implemented with view switching, Command Palette trigger, and theme toggle.
- [x] Command Palette implemented with keyboard shortcuts and fuzzy search actions.
- [x] Dashboard Overview implemented with 4-up metrics, engine health, and live telemetry.
- [x] Source Registry implemented with SSRF verification, version pinning, and table inspector.
- [x] Discovery Center upgraded with Astryx high-density styling, provider quotas, and review queue.
- [x] Job Monitor implemented with 6-stage pipeline tracker and terminal log viewer.
- [x] Artifact Viewer implemented with dual markdown/JSON preview and provenance verification.
- [x] Search Explorer implemented with multi-mode search, syntax highlighting, and copy for agents.
- [x] Full static build verification: `pnpm --filter @devknowledge/web build:pages` exits with code 0.
