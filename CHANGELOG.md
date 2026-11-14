# Changelog

All notable changes to DevKnowledge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-11-14

### Added
- **Meta Astryx-Inspired Frontend Redesign (`apps/web`)**:
  - Semantic Astryx design system tokens in Tailwind and CSS variables supporting accessible dark/light themes.
  - Command Palette modal (`Cmd+K`) with fuzzy search and quick actions.
  - Dense, technical Navigation Shell with environment status, active telemetry stream, and breadcrumb tickers.
  - Redesigned Dashboard Overview with 4-up metric cards and live engine health indicators.
  - Upgraded Source Registry, Discovery Center, Job Monitor, Artifact Viewer, and Search Explorer.
  - WCAG 2.1 AA accessibility compliance with visible focus rings (`astryx-focus`) and full keyboard navigation.
- **TypeScript MCP Server Upgrade (`packages/mcp-server`)**:
  - Full implementation of all 10 MCP tools (`search_docs`, `get_document`, `get_api_reference`, `get_code_examples`, `check_compatibility`, `get_project_knowledge`, `list_sources`, `get_source_status`, `trigger_source_sync`, `inspect_cache`).
  - Added MCP prompts (`query_doc`, `audit_dependencies`, `api_lookup`) and resources (`devknowledge://sources/list`, `devknowledge://health`).
  - Strict MCP protocol error response mapping with `isError: true`.
- **Rust Runtime & Offline SQLite Cache Hardening**:
  - SQLite FTS5 query sanitization (`sanitize_fts_query`) preventing syntax errors on special characters and operators.
  - Enabled SQLite WAL mode, foreign keys, and synchronous NORMAL.
  - Native manifest parsers in Rust for `Cargo.toml`, `package.json`, `pyproject.toml`, and `requirements.txt`.
  - Comprehensive unit test coverage across all 5 workspace crates (12/12 passing).

### Security & Reliability Fixes
- **SEC-02 (P0)**: Hardened runner authentication in `apps/api/app/jobs/router.py` using constant-time `hmac.compare_digest` to prevent timing attacks, and enforced fail-closed validation.
- **SEC-03 (P1)**: Protected Cloudflare Worker `/api/v1/sync/dispatch` route with mandatory `RUNNER_API_KEY` verification.
- **DB-01 (P1)**: Hardened SQLAlchemy engine in `apps/api/app/database/session.py` with `pool_pre_ping=True`, `pool_recycle=300`, and connection bounds to prevent Supabase connection exhaustion.
- **CWL-01 (P1)**: Resolved crawler silent failure on blocked/zero-page targets; failed jobs now properly transition to `failed` with durable queue exponential backoff.
- **PARSER-01 (P1)**: Refactored Python dependency manifest parsing using standard `tomllib` to correctly handle inline tables with multiple keys (e.g. `features` before `version`).

## [1.1.0] - 2026-11-14

### Added
- **Free-Cloud Zero-Cost Deployment Infrastructure (₹0/Month)**:
  - **Durable PostgreSQL Job Queue**: Atomic claiming via `FOR UPDATE SKIP LOCKED`, lease-based execution, worker heartbeats, exponential backoff, dead-letter routing, duplicate execution protection via `idempotency_key`, and recovery of abandoned jobs.
  - **Cloudflare Integration**:
    - Cloudflare Pages configuration for zero-cost static Next.js export (`apps/web/out`).
    - Cloudflare Workers lightweight API gateway (`apps/cloudflare-worker`) complying with <50ms CPU limits and request rate limits.
    - Cloudflare Cron Triggers (`*/15 * * * *`) for automatic synchronization scheduling.
  - **Cloudflare R2 Storage Adapter**: S3-compatible storage backend with AWS SigV4, SHA-256 cryptographic snapshot integrity verification, and local fallback.
  - **GitHub Actions Crawler Runner**: Ephemeral Playwright crawler execution (`.github/workflows/crawler-runner.yml` and `apps/worker/runner.py`) with authenticated job claiming, background heartbeats, and completion/failure callbacks.
  - **Zero-Cost Safeguards**: Quota tracker enforcing free-tier boundaries (Neon 500MB, R2 10GB, Workers 100k req/day, GHA 2,000 mins/mo) with automatic graceful pause at 90% threshold.
  - **Serverless Cache Abstraction**: Serverless Upstash Redis HTTP REST adapter with seamless in-memory fallback.
  - **Disaster Recovery**: Automated Neon PostgreSQL and SQLite backup script with SHA-256 integrity checks and R2 archiving (`infrastructure/backup/neon_r2_backup.sh`).
  - **Comprehensive Documentation**: Complete deployment manual in `docs/DEPLOYMENT_FREE_CLOUD.md`.

## [1.0.0] - 2026-11-14

### Added
- **M0 — Engineering Foundation**:
  - Full monorepo repository architecture
  - Canonical PRD, Architecture, Database schema, API specification, Security policy
  - Threat model and SSRF validation specifications
  - Cross-platform Rust workspace (`crates/`)
  - Python backend & worker workspace (`apps/api`, `apps/worker`)
  - TypeScript web app and packages (`apps/web`, `packages/`)
  - CI baseline for GitHub Actions
  - Docker Compose deployment setup
- **M1 — Documentation Registry**:
  - User authentication with bcrypt password hashing and JWT access tokens
  - Multitenant organization scoping across all resources
  - Source URL registration with SSRF pre-flight validation and duplicate detection
  - Automatic display name and technology category suggestion
  - Configurable crawl boundaries and synchronization policies
- **M2 — Universal Crawler**:
  - SSRF-hardened `SafeHTTPClient` with DNS pre-flight checks and redirect revalidation
  - XML sitemap parser and `llms.txt` discovery
  - Framework extraction adapters for Docusaurus, MkDocs, VitePress, Sphinx, and Generic HTML
  - Code snippet syntax extraction, language tagging, and API symbol deprecation detection
  - Asynchronous breadth-first crawler engine with progress tracking
- **M3 — Canonical Knowledge Compiler**:
  - Canonical Knowledge Representation (CKR) document models with reproducible content hashing
  - Markdown compiler with provenance frontmatter
  - Standard `llms.txt` and `llms-full.txt` index and bundled compilers
  - `AGENTS.md` and `SKILL.md` synthesis from documented workflows
  - Immutable `SourceSnapshot` generation and atomic publishing
- **M4 — Automatic Synchronization**:
  - Content change classification (`no_change`, `content_update`, `api_signature_change`, `deprecation_added`)
  - Sync scheduler checking source interval policies
  - Snapshot diffing API exposing added, modified, and removed pages
  - Safe atomic publishing and instant snapshot rollback
  - `sync_events` audit trail recording
- **M5 — Search and Knowledge Retrieval**:
  - Full-text search across titles, headings, and code examples
  - Relevance ranking with exact and substring match scoring
  - Document retrieval API with section tree and symbol metadata
  - Strict multitenant isolation preventing cross-organization data access
- **M6 — MCP Integration**:
  - Native Model Context Protocol (MCP) server over stdio
  - 10 read-only tools: `search_docs`, `get_document`, `get_api_reference`, `get_code_examples`, `compare_doc_versions`, `check_deprecated_api`, `check_compatibility`, `get_source_metadata`, `list_knowledge_sources`, `get_project_knowledge`
  - Automated stdio client integration test
- **M7 — Local Runtime and CLI**:
  - Cross-platform Rust CLI binary `devknowledge` for macOS, Linux, and Windows
  - Embedded SQLite cache with FTS5 search index
  - CLI commands: `login`, `logout`, `source add`, `source list`, `source sync`, `search`, `docs get`, `status`, `doctor`
  - Zero-latency local offline documentation retrieval
- **M8 — Project Intelligence**:
  - Manifest parser for `package.json`, `Cargo.toml`, `pyproject.toml`, and `requirements.txt`
  - Dependency version constraint detection and source matching
  - Pinned version retrieval preventing hallucination of newer incompatible APIs
  - Explicit `version_mismatch` and `missing_documentation` warnings
- **M9 — Production Release**:
  - Prometheus metrics endpoint (`/api/v1/metrics`)
  - Automated database backup and integrity verification script (`infrastructure/backup/backup_restore.sh`)
  - End-to-end full system integration test covering complete pipeline
  - 100% passing test suite across Python, Rust, and TypeScript/Node
