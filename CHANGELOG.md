# Changelog

All notable changes to DevKnowledge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
