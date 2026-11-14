# DevKnowledge — Hardening & Remediation Plan

**Document:** `docs/audit/REMEDIATION_PLAN.md`  
**Date:** November 14, 2026  
**Auditor / Security Architect:** Backend Infrastructure & Security Agent (`@auditor_backend`)  
**Scope:** Actionable Implementation Plan for Identified Backend, Database, and Security Vulnerabilities  
**Branch:** `audit/devknowledge-hardening-and-ui`  
**Status:** **PHASE 1 & PHASE 2 IMPLEMENTED; PHASE 3 ROADMAP DEFINED**  

---

## 1. Remediation Phases Overview

```
+-------------------------------------------------------------------------------+
| PHASE 1: IMMEDIATE CRITICAL FIXES (P0)                                       |
| - Secure Durable Job Queue API (authenticate_runner_or_user fail-closed)      |
| - Secure Cloudflare Worker Manual Dispatch (RUNNER_API_KEY enforcement)       |
| - Supabase PostgREST Row-Level Security (RLS) Lockdown SQL Blueprint          |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
| PHASE 2: SYSTEM RELIABILITY & ERROR RECOVERY HARDENING (P1)                   |
| - SQLAlchemy PostgreSQL Connection Pool (pool_pre_ping, pool_recycle, bounds) |
| - Crawler Zero-Page Failure Detection & Durable Queue Backoff Integration     |
| - Sync Scheduler JobQueueService Integration with Idempotency & Quota Guards  |
| - Formatting, Linter & Dev Fallback Hardening (Ruff Cleanliness)              |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
| PHASE 3: RESILIENCE & ARCHITECTURAL EVOLUTION (P2 / FUTURE)                   |
| - Custom HTTP Transport with Socket IP Pinning (Anti-DNS Rebinding)          |
| - In-Memory FastAPI Rate Limiting Middleware for Auth Endpoints               |
| - Automated Database Migration RLS Policy Enforcement                         |
+-------------------------------------------------------------------------------+
```

---

## 2. Phase 1: Immediate Critical Fixes (P0) — Completed

### 2.1 Job Queue Authentication Hardening
- **Target File:** `apps/api/app/jobs/router.py`
- **Issue:** Function previously returned `{"type": "runner_direct", "id": "local"}` when no key was passed.
- **Action Taken:**
  1. Integrated `hmac.compare_digest` for timing-attack-safe runner key validation.
  2. Integrated user JWT decoding via `decode_access_token` for authenticated human dashboard access.
  3. Fails closed with `HTTP 401 Unauthorized` when neither credential is provided.
  4. Restricted local direct bypass strictly to `settings.ENVIRONMENT == "testing"`.
  5. Applied authentication to `/enqueue`, `/claim`, `/{job_id}/heartbeat`, `/{job_id}/complete`, `/{job_id}/fail`, `/{job_id}/cancel`, and `/recover`.
- **Test Evidence:** `test_runner_api_key_authentication` in `tests/test_backend_hardening.py` passes.

### 2.2 Cloudflare Edge Worker Dispatch Protection
- **Target File:** `apps/cloudflare-worker/src/index.ts`
- **Issue:** `/api/v1/sync/dispatch` triggered GitHub Actions without validating the caller.
- **Action Taken:**
  1. Added header inspection for `Authorization: Bearer <RUNNER_API_KEY>` and `X-Runner-Key: <RUNNER_API_KEY>`.
  2. If `env.RUNNER_API_KEY` is present and does not match the provided key, immediately returns `HTTP 401 Unauthorized`.
- **Build Evidence:** `pnpm --filter @devknowledge/cloudflare-worker build` passed cleanly with 0 TypeScript errors.

### 2.3 Supabase PostgreSQL RLS Lockdown (Manual Action in Supabase Console)
- **Target:** Supabase PostgreSQL 17 Instance (`hlnbfjdhedkbrnrvkswm.supabase.co`)
- **Action Required:** Execute the following SQL script in the Supabase Dashboard SQL Editor as `postgres` superuser:
```sql
-- 1. Enable Row-Level Security across all 25 public application tables
ALTER TABLE public.agent_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alembic_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_symbols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawl_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_global_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentation_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentation_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technology_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Revoke PostgREST Anonymous and Authenticated Access from Public Tables
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
```

---

## 3. Phase 2: System Reliability & Error Recovery (P1) — Completed

### 3.1 Hardened Database Connection Pooling
- **Target File:** `apps/api/app/database/session.py`
- **Action Taken:**
  1. Configured `pool_pre_ping=True` to eliminate broken socket / connection reset errors caused by Supabase idle disconnects.
  2. Configured `pool_recycle=300` (5 minutes) for proactive socket refresh.
  3. Set `pool_size=10, max_overflow=20, pool_timeout=30` to strictly bound connection usage within Supabase free-tier limits (max 60 connections).
  4. Preserved SQLite single-thread options for offline testing.

### 3.2 Crawler Zero-Page Failure & Durable Retry Integration
- **Target File:** `apps/worker/crawler/engine.py`
- **Action Taken:**
  1. Added zero-page failure assertion: when `pages_processed == 0 and pages_failed > 0`, the job status is set to `failed`, source status is set to `error`, and a `RuntimeError` is raised.
  2. This triggers `GitHubActionsCrawlerRunner.fail_job()`, causing `JobQueueService` to record the failure details and schedule exponential backoff retry (30s, 60s, 120s...).
  3. Protected sitemap discovery with non-fatal error handling so crawler falls back to standard traversal if sitemap XML is malformed.
- **Test Evidence:** `test_crawler_zero_pages_error_recovery` in `tests/test_backend_hardening.py` passes.

### 3.3 Sync Scheduler Quota & Idempotency Integration
- **Target File:** `apps/worker/sync/scheduler.py`
- **Action Taken:**
  1. Replaced direct `CrawlJob` construction with `JobQueueService.enqueue_job()`.
  2. Injected hourly idempotency key `sync:{source_id}:{YYYYMMDDHH}` to eliminate duplicate crawls.
  3. Handled `QuotaLimitExceededError` gracefully with warning logs to prevent task crashes when zero-cost thresholds are reached.
- **Test Evidence:** `test_sync_scheduler_idempotency_and_queue` in `tests/test_backend_hardening.py` passes.

### 3.4 Code Formatting and Linter Enforcement
- **Target Files:** `tests/conftest.py`, `apps/api/app/storage/backend.py`, `integrity.py`
- **Action Taken:**
  1. Removed unused imports and organized import blocks.
  2. Formatted all Python files with `uv run ruff format .` (102 files formatted).
  3. Verified 100% compliance with `uv run ruff check .` and `uv run ruff format --check .`.

---

## 4. Phase 3: Resilience & Architectural Evolution (P2 Roadmap)

1. **DNS Rebinding Hardening (Socket Pinning):**
   - Implement an `httpx.AsyncBaseTransport` that resolves hostnames through `SSRFValidator` once and pins the resulting IP for the duration of the HTTP connection, eliminating TOCTOU DNS rebinding risks.
2. **FastAPI In-Memory Rate Limiting:**
   - Implement a token bucket or sliding-window rate limiting middleware for FastAPI to defend `/api/v1/auth/login` and `/api/v1/auth/register` against brute-force attacks in direct container deployments.
3. **Automated Migration RLS Checks:**
   - Integrate an Alembic migration hook or CI lint step to ensure any newly added tables automatically include `ENABLE ROW LEVEL SECURITY`.

---

## 5. Verification Commands & Regression Checklist

Run the following test commands to verify all remediations:

```bash
# 1. Run Python unit, integration, and security test suites
uv run pytest -v

# 2. Verify Ruff linting
uv run ruff check .

# 3. Verify Ruff formatting
uv run ruff format --check .

# 4. Verify Cloudflare Worker compilation
pnpm --filter @devknowledge/cloudflare-worker build

# 5. Verify Rust workspace tests and clippy
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
cargo fmt --check

# 6. Verify Frontend production export
pnpm --filter @devknowledge/web build:pages
```
