# DevKnowledge — REST API Specification

**Base URL:** `/api/v1`  
**Protocol:** REST over HTTPS  
**Authentication:** Bearer token (JWT) or Scoped API Key (`X-API-Key`)

## 1. Authentication Endpoints
- `POST /api/v1/auth/register` — Register new user and organization
- `POST /api/v1/auth/login` — Login and receive access & refresh tokens
- `POST /api/v1/auth/refresh` — Refresh access token
- `GET /api/v1/auth/me` — Retrieve current user profile and organization

## 2. Documentation Sources
- `POST /api/v1/sources` — Register new documentation URL
- `GET /api/v1/sources` — List registered sources with pagination and filters
- `GET /api/v1/sources/{source_id}` — Get source details, crawl status, active snapshot
- `PATCH /api/v1/sources/{source_id}` — Update source configuration or sync policy
- `DELETE /api/v1/sources/{source_id}` — Remove documentation source
- `POST /api/v1/sources/{source_id}/sync` — Trigger immediate synchronization check
- `GET /api/v1/sources/{source_id}/status` — Real-time crawling/sync status
- `GET /api/v1/sources/{source_id}/pages` — List extracted pages for source
- `GET /api/v1/sources/{source_id}/versions` — List historical snapshot versions

## 3. Crawl & Ingestion Jobs
- `POST /api/v1/crawl-jobs` — Trigger new crawl job (full or incremental)
- `GET /api/v1/crawl-jobs` — List jobs with status and progress
- `GET /api/v1/crawl-jobs/{job_id}` — Detailed job status, metrics, and error logs
- `POST /api/v1/crawl-jobs/{job_id}/cancel` — Abort running crawl job

## 4. Knowledge Retrieval & Search
- `GET /api/v1/search` — Query docs (params: `q`, `source_id`, `version`, `limit`)
- `POST /api/v1/search` — Advanced hybrid search with vector & keyword weighting
- `GET /api/v1/documents/{document_id}` — Retrieve full canonical document
- `GET /api/v1/documents/{document_id}/versions` — Document change history
- `GET /api/v1/sources/{source_id}/artifacts` — Retrieve compiled files (`llms.txt`, etc.)
- `GET /api/v1/sources/{source_id}/manifest` — Release manifest for sync clients

## 5. Version Intelligence & Diffing
- `GET /api/v1/snapshots/{snapshot_id}` — Snapshot manifest and metadata
- `GET /api/v1/snapshots/{snapshot_id}/diff` — Compare two snapshots (added, modified, deleted)
- `GET /api/v1/pages/{page_id}/history` — Full revision history of a page

## 6. Project Intelligence
- `POST /api/v1/projects` — Create project profile
- `GET /api/v1/projects` — List project profiles
- `GET /api/v1/projects/{project_id}` — Project details and attached documentation
- `POST /api/v1/projects/{project_id}/dependencies/import` — Parse manifest (`package.json`, `Cargo.toml`, etc.)
- `GET /api/v1/projects/{project_id}/knowledge` — Scoped documentation retrieval

## 7. Agent & Local Runtime Integration
- `POST /api/v1/agents/register` — Register MCP client or local runtime token
- `GET /api/v1/runtime/manifest` — Complete manifest of sources for local offline cache
- `POST /api/v1/runtime/sync` — Sync delta updates between local runtime and cloud

## 8. System Health
- `GET /api/v1/health` — Liveness check
- `GET /api/v1/ready` — Readiness check (DB & Redis connectivity)
- `GET /api/v1/metrics` — Prometheus metrics (authenticated)
