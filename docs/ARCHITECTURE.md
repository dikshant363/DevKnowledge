# DevKnowledge — System Architecture

## 1. Architectural Overview

DevKnowledge follows a modular monolith architecture designed for reliability, deterministic extraction, and cloud-first deployment with an offline-capable cross-platform local runtime.

```text
                    DEVELOPER / CODING AGENT
                                |
             +------------------+------------------+
             |                                     |
             v                                     v
      NEXT.JS WEB APP                     DEV KNOWLEDGE CLI / MCP
             |                                     |
             v                                     v
       FASTAPI API GATEWAY <---------------- LOCAL RUNTIME (RUST)
             |                                 (SQLite Cache)
    +--------+--------+--------+
    |                 |        |
    v                 v        v
 REGISTRY        KNOWLEDGE API AUTH / RBAC
    |
    v
 JOB ORCHESTRATOR
    |
    v
 REDIS QUEUE (ARQ / Asynchronous Workers)
    |
 +--+----------------------+
 |                         |
 v                         v
CRAWLER WORKERS       SYNC WORKERS
 |                         |
 v                         v
EXTRACTION ENGINE     CHANGE DETECTOR
 |                         |
 +------------+------------+
              |
              v
       CANONICAL KNOWLEDGE (CKR)
              |
      +-------+--------+
      |       |        |
      v       v        v
    SEARCH  COMPILER  VERSIONING (Immutable Snapshots)
      |       |        |
      +-------+--------+
              |
              v
       DISTRIBUTION LAYER
              |
      +-------+--------+
      |       |        |
      v       v        v
     MCP     CLI   ARTIFACTS (llms.txt, AGENTS.md, SKILL.md, Markdown)
```

## 2. Core Subsystems

### 2.1 Backend API Gateway (`apps/api`)
Built with Python 3.12, FastAPI, and Pydantic v2.
Provides:
- Documentation Source Registry
- Auth & RBAC (Bearer tokens, hashed API keys)
- Search & Retrieval APIs (Full-Text Search + Vector hybrid)
- Snapshot & Release Manifest Management
- Project Profile Dependency Analyzer

### 2.2 Crawl & Extraction Engine (`apps/worker`)
Universal crawler designed for web scale and security:
- **SSRF Hardened**: DNS resolution pre-checks, loopback/private IP blocking, redirect re-validation.
- **Extraction**: Fast, deterministic static HTML parsing via Selectolax & BeautifulSoup, with optional headless Playwright worker for dynamic JS-rendered docs.
- **Framework Adapters**: Detection and structure extraction for Docusaurus, MkDocs, VitePress, GitBook, Mintlify, ReadTheDocs, Sphinx, Nextra, and fallback generic semantic HTML parser.

### 2.3 Canonical Knowledge Representation (CKR)
The intermediate document model:
- Normalizes all technical docs into structured blocks (sections, headings, code snippets with language tags, API symbol signatures, parameter tables, deprecation alerts).
- Computes SHA-256 content hashes at page, section, and snapshot levels.

### 2.4 Knowledge Compiler (`packages/compiler` & `apps/api/app/compiler`)
Compiles CKR into:
- `llms.txt` & `llms-full.txt` (standardized agent discovery formats)
- `AGENTS.md` (agent instructions and conventions)
- `SKILL.md` (task-specific execution skills)
- Clean, structured GitHub Flavored Markdown
- OpenAPI specs extracted from documentation
- MCP tool & resource endpoints

### 2.5 Continuous Synchronization Engine
- Periodic revalidation with ETag / Last-Modified / sitemap change frequency.
- Webhook endpoints for documentation repositories (GitHub/GitLab push hooks).
- Three-way merge & diff comparison between previous active snapshot and new crawl.
- Automated safety gates: quarantine low-confidence extractions, preserve rollback pointers.

### 2.6 Local Runtime & CLI (`crates/cli` & `crates/runtime`)
Built in Rust for native performance, safety, and zero-runtime dependency deployment on macOS, Windows, and Linux:
- `devknowledge` CLI for searching, syncing, project profiling, and managing docs.
- Embedded local SQLite cache (`~/.devknowledge/database/knowledge.db`).
- Embedded local Model Context Protocol (MCP) server.

## 3. Storage Architecture
- **Cloud Primary DB**: PostgreSQL 16+ with `pgvector` for hybrid full-text and semantic search.
- **Queue & Ephemeral State**: Redis 7.
- **Artifact Storage**: Local filesystem or S3-compatible object storage (MinIO, Cloudflare R2, AWS S3).
- **Local Dev / Offline / Testing**: SQLite / aiosqlite engine compatibility built directly into database abstractions.
