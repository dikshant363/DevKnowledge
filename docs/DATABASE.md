# DevKnowledge — Database Schema & Data Model

## 1. Relational Model Overview

DevKnowledge uses PostgreSQL with standard ANSI SQL / SQLAlchemy abstractions, ensuring full compatibility with SQLite for local development, testing, and offline runtime.

UUIDv4 is used for all primary keys. All timestamps are stored in UTC (`TIMESTAMP WITH TIME ZONE`).

## 2. Core Tables

### 2.1 Identity & Multitenancy
- **`users`**: User identity, hashed credentials, account status, timestamps.
- **`organizations`**: Tenant accounts, slug, owner reference.
- **`organization_members`**: Multitenant membership and RBAC role (`owner`, `admin`, `member`, `reader`).

### 2.2 Documentation Registry
- **`documentation_sources`**: Registered documentation sites. Stores `root_url`, `canonical_domain`, `category`, `documentation_type`, `crawl_config` (JSONB), `sync_policy` (JSONB), `status`, `active_snapshot_id`.
- **`documentation_pages`**: Extracted pages. Unique constraint on `(source_id, canonical_url)`. Stores `normalized_path`, `title`, `current_content_hash`, `current_version_id`.
- **`crawl_jobs`**: Job tracking for crawling, extraction, and sync. Stores status, priority, discovered/processed/failed counters, error summaries.

### 2.3 Snapshots & Content Versioning
- **`source_snapshots`**: Immutable versioned release manifests for a documentation source. Unique snapshot hash, page count, publication timestamp.
- **`page_versions`**: Immutable historical versions of individual pages. Unique on `(page_id, content_hash, snapshot_id)`. Stores structured CKR JSONB.
- **`sync_events`**: Detailed audit trail of content and metadata changes detected upstream.

### 2.4 Knowledge Elements & Relationships
- **`knowledge_chunks`**: Section-level text chunks with token count, type, vector embedding (`VECTOR` / text fallback), and full-text search index (`tsvector`).
- **`api_symbols`**: Structured API symbols (functions, classes, interfaces, types) extracted from documentation with signatures, parameter lists, and deprecation markers.
- **`code_examples`**: Extracted code blocks with programming language identifiers, descriptions, and validation status.
- **`knowledge_relationships`**: Knowledge graph edges connecting technologies, frameworks, APIs, and pages.

### 2.5 Distribution, Projects & Security
- **`generated_artifacts`**: Output formats compiled from CKR (`llms.txt`, `llms-full.txt`, `AGENTS.md`, `SKILL.md`, markdown bundle).
- **`project_profiles`**: Developer project configuration with pinned dependencies.
- **`project_dependencies`**: Ecosystem, package name, version constraints resolved to documentation sources.
- **`agent_connections`**: Registered MCP clients, CLI tokens, scopes.
- **`audit_logs`**: Tamper-evident logging of administrative actions, crawl updates, and publishing decisions.

## 3. Migration Strategy
All schema changes are versioned using Alembic (`database/migrations/`).
Migrations run idempotently upon deployment.
Indexes include:
- B-Tree indexes on `source_id`, `canonical_url`, `snapshot_id`, `created_at`.
- GIN indexes on JSONB fields and PostgreSQL `tsvector` columns for full-text search.
- HNSW or IVFFlat indexes on vector embeddings when using `pgvector`.
