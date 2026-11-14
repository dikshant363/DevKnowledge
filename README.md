# DevKnowledge

> **Universal AI Developer Knowledge Infrastructure**  
> Continuous documentation intelligence for AI coding agents and engineering teams.

---

## 🌟 Overview

**DevKnowledge** transforms arbitrary documentation websites into structured, searchable, version-aware knowledge accessible to AI coding agents and developer tools.

### Value Proposition
```text
One URL → Ingestion & Parsing → CKR Normalization → Continuous Sync → Connected AI Agents
```

- **Universal Documentation Ingestion**: Ingest docs for Android, iOS, Rust, Python, Go, React, Linux, AI/ML, and arbitrary frameworks without rigid custom site scrapers.
- **Continuous Synchronization**: Monitors documentation changes via sitemaps, ETags, content hashes, and webhooks; atomically publishes verified snapshots.
- **Canonical Knowledge Representation (CKR)**: Preserves headings, structured code blocks, API signatures, parameter tables, deprecation notices, and source provenance.
- **AI-Native Output Targets**: Generates `llms.txt`, `llms-full.txt`, `AGENTS.md`, `SKILL.md`, structured Markdown, and MCP endpoints.
- **Local Runtime & CLI**: High-performance Rust CLI (`devknowledge`) with embedded SQLite cache for zero-latency, offline documentation access on macOS, Windows, and Linux.
- **Zero Mandatory Paid APIs**: Self-hostable, open-source stack designed for ₹0 initial infrastructure cost.

---

## 🏗️ Architecture

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
```

---

## 🚀 Quick Start

### 1. Requirements
- Node.js 20+ & pnpm
- Python 3.12+ & `uv`
- Rust 1.78+ & `cargo`
- Docker (optional for containerized setup)

### 2. Setup
```bash
# Clone the repository
git clone https://github.com/devknowledge/devknowledge.git
cd devknowledge

# Install Python backend dependencies
uv venv
source .venv/bin/activate
uv pip install -e ".[dev]"

# Install frontend and package dependencies
pnpm install

# Build Rust crates
cargo build --workspace
```

### 3. Run Development Services
```bash
# Start background infrastructure (PostgreSQL & Redis)
docker compose up -d postgres redis

# Run FastAPI backend
uv run uvicorn apps.api.app.main:app --reload --port 8000

# Run Web Dashboard
pnpm --filter @devknowledge/web dev
```

---

## 📂 Repository Structure

- `apps/`
  - `api/`: FastAPI REST Gateway & Knowledge Engine
  - `web/`: Next.js 14+ Web Application
  - `worker/`: Crawler, extraction & background sync workers
- `crates/`
  - `cli/`: `devknowledge` command-line tool (Rust)
  - `runtime/`: Local runtime & sync client
  - `cache/`: SQLite offline knowledge cache
  - `sync-engine/`: Hash diffing and manifest synchronization
  - `knowledge-client/`: API client
  - `shared-types/`: Common CKR data models
- `packages/`
  - `mcp-server/`: Model Context Protocol server
  - `canonical-schema/`: TypeScript schemas for CKR
- `database/`
  - `migrations/`: Alembic database migrations
- `infrastructure/`
  - `docker/`: Dockerfiles for API, Worker, and Web
- `docs/`: In-depth PRD, Architecture, Database, Security, and API documentation

---

## 🛡️ Security

DevKnowledge implements strict security boundaries:
- **SSRF Hardening**: Resolves DNS pre-flight to block loopback, RFC 1918 private subnets, cloud metadata IPs, and re-validates all redirects.
- **Untrusted Documentation Quarantine**: Extracted content is treated as data, preventing prompt injection attacks against AI coding agents.
- **Multitenant Isolation**: Strict organization-level scoping across all data models.

---

## 📜 License

Licensed under the Apache License, Version 2.0. See [LICENSE](file:///Users/dikshantagarwal/Desktop/DevKnowledge/LICENSE) for details.
