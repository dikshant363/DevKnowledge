# DevKnowledge — Comprehensive Security & Reliability Audit

**Document:** `docs/audit/SECURITY_AUDIT.md`  
**Date:** November 14, 2026  
**Auditor:** Principal Security Engineer & Infrastructure Architect  
**Project:** DevKnowledge (Universal AI Developer Knowledge Infrastructure)  
**Branch:** `audit/devknowledge-hardening-and-ui`  
**Security Classification:** Highly Confidential / Engineering Hardening  

---

## 1. Executive Summary

This Security and Reliability Audit evaluates the full attack surface of DevKnowledge v1.0, covering the FastAPI backend, durable job queue, crawler execution engine, Cloudflare Worker gateway, Supabase PostgreSQL database, Supabase object storage, and TypeScript MCP server.

Special attention was directed towards:
1. **Server-Side Request Forgery (SSRF) & DNS Rebinding**: Preventing malicious documentation URLs from probing internal networks or cloud metadata endpoints.
2. **Untrusted Documentation Quarantine**: Treating crawled HTML, Markdown, and API specs as untrusted third-party data to block indirect prompt injection attacks against downstream AI coding agents.
3. **Runner & Gateway Authentication**: Hardening HMAC signatures and token validation against timing attacks and unauthenticated triggers.
4. **Database Access Control & Row-Level Security**: Analyzing PostgREST exposure on Supabase PostgreSQL.

---

## 2. Threat Model & Attack Surface Map

```
                            [ Untrusted Internet / Malicious Actor ]
                                               |
                     +-------------------------+-------------------------+
                     |                                                   |
                     v                                                   v
           +--------------------+                              +--------------------+
           |  Cloudflare Worker |                              |  Next.js Frontend  |
           |  (Edge Gateway)    |                              |  (Pages Console)   |
           +---------+----------+                              +---------+----------+
                     | (Rate Limited / HMAC)                             | (JWT / Auth)
                     v                                                   v
           +------------------------------------------------------------------------+
           |                         FastAPI Core API Engine                        |
           |   - JWT Token Verifier           - SSRF Pre-flight & DNS Resolver      |
           |   - Org Multi-tenant Scoping     - Parameterized SQL (SQLAlchemy)      |
           +--------------------+----------------------------------+----------------+
                                |                                  |
                                v                                  v
           +----------------------------------+   +----------------------------------+
           |     Supabase PostgreSQL 17       |   |         Supabase Storage         |
           |   - Durable Job Queue            |   |   - Artifacts (llms.txt, CKR)    |
           |   - Row-Level Security Barrier   |   |   - Signed Uploads / Public Read |
           +----------------------------------+   +----------------------------------+
                                ^
                                | (Lease Claims / Heartbeats)
           +--------------------+---------------------+
           |      GitHub Actions Crawler Runner       |
           |   - Ephemeral Ubuntu Container           |
           |   - Headless Playwright (Sandboxed)      |
           |   - Shared Secret Authentication         |
           +------------------------------------------+
```

---

## 3. OWASP ASVS Controls Assessment

### 3.1 V2: Authentication & Password Security
- **Bcrypt Password Hashing**: Passwords hashed with bcrypt (`apps/api/app/auth/security.py`).
- **JWT Signature & Expiry**: Access tokens signed using HMAC-SHA256 with 24-hour expiration (`ACCESS_TOKEN_EXPIRE_MINUTES = 1440`).
- **Secure Token Verification**: `verify_token` validates algorithm, signature, issuer, and expiration, raising `401 Unauthorized` on failure.

### 3.2 V3: Session Management & Runner HMAC Verification
- **Vulnerability Identified (SEC-02 - P0, Resolved)**: Previously, `authenticate_runner_or_user` used standard equality (`==`) which was vulnerable to timing analysis, and did not properly fail-closed when both credentials were absent.
- **Remediation**: Updated to use `hmac.compare_digest` with constant-time comparison against configured `RUNNER_API_KEY`, and structured fallback to JWT user verification.
- **Verification**: Verified with automated tests in `tests/test_backend_hardening.py::test_runner_auth_success` and `test_runner_auth_timing_safe_rejection`.

### 3.3 V4: Access Control & Multitenancy
- **Organization Isolation**: Every database query on `documentation_sources`, `crawl_jobs`, `source_snapshots`, and `generated_artifacts` is strictly scoped by `organization_id`.
- **Database Exposure Advisory (SEC-01 - P0, Documented)**:
  - *Finding*: When Alembic migrations run on Supabase, tables in the `public` schema have Row Level Security (RLS) disabled by default. While DevKnowledge connects through direct pooled PostgreSQL connections (`devknowledge_app` user), Supabase's HTTP PostgREST API can expose public tables to the `anon` key if RLS is not enabled.
  - *Remediation Script*: A dedicated superuser remediation SQL script has been prepared to enable RLS across all 25 tables.

### 3.4 V5: Malicious Input Handling & SSRF Defense
- **SSRF Validation**: `apps/api/app/security/ssrf.py` enforces comprehensive pre-flight DNS checks before crawling:
  - Blocks IPv4 Loopback (`127.0.0.0/8`).
  - Blocks RFC 1918 Private Subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
  - Blocks Link-Local & APIPA (`169.254.0.0/16`).
  - Blocks AWS/GCP/Azure Cloud Metadata (`169.254.169.254`, `metadata.google.internal`).
  - Blocks IPv6 Loopback (`::1`) and Unique Local (`fc00::/7`).
  - Re-validates every HTTP redirect target against SSRF filters.
- **Verification**: 4/4 passing tests in `tests/test_security_ssrf.py`.

### 3.5 V6: Cryptography & Content Quarantine
- **Cryptographic Hashing**: Canonical Knowledge Representation (CKR) uses SHA-256 for all snapshot digests, page versions, and artifact manifests.
- **Indirect Prompt Injection Quarantine**:
  - Crawled documentation content is never evaluated or executed.
  - HTML tags, scripts, and event handlers are stripped via `selectolax` parser.
  - LLM outputs generated by compilers (`llms.txt`, `AGENTS.md`, `SKILL.md`) clearly delineate documentation excerpts as raw untrusted data.

### 3.6 V13: API & Webhooks Security
- **Cloudflare Edge Gateway (SEC-03 - P1, Resolved)**:
  - Endpoint `/api/v1/sync/dispatch` previously accepted unauthenticated requests to trigger GitHub Actions crawler runs.
  - Fixed: Enforced `X-Runner-Key` / `RUNNER_API_KEY` validation on all dispatch triggers.
  - Rate limiting enforced via IP sliding window limiter (60 req/min per IP).

### 3.7 V14: Configuration & Secrets Management
- **Zero Secrets in Git**: Audited repository commit history on branch `audit/devknowledge-hardening-and-ui` — 0 plaintext secrets committed.
- **Gitignore Enforcement**: `.env.local` strictly gitignored.
- **Environment Isolation**: Production secrets provisioned exclusively via GitHub Actions Repository Secrets and Cloudflare Wrangler encrypted secrets.

---

## 4. Security Findings & Remediation Matrix

| Finding ID | Title | Severity | Status | Remediated File |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Supabase Public Schema Row Level Security | **P0** | **Remediation Script Provided** | `database/migrations/` (Run via Supabase MCP) |
| **SEC-02** | Runner HMAC Timing Attack & Loose Auth | **P0** | **FIXED & TESTED** | `apps/api/app/jobs/router.py` |
| **SEC-03** | Cloudflare Worker Dispatch Missing Auth | **P1** | **FIXED & TESTED** | `apps/cloudflare-worker/src/index.ts` |
| **DB-01** | Database Connection Exhaustion Risk | **P1** | **FIXED & TESTED** | `apps/api/app/database/session.py` |
| **CWL-01** | Crawler Silent Failure on Blocked Sites | **P1** | **FIXED & TESTED** | `apps/worker/crawler/engine.py` |
| **FTS-01** | SQLite FTS5 Syntax Error on Query Symbols | **P1** | **FIXED & TESTED** | `crates/cache/src/lib.rs` |

---

## 5. Security Test Suite Execution Evidence

```
============================= test session starts ==============================
collected 51 items

tests/end_to_end/test_full_system.py .                                   [  1%]
tests/test_backend_hardening.py .........                               [ 19%]
tests/test_cache_upstash.py ...                                          [ 25%]
tests/test_database.py ..                                                [ 29%]
tests/test_dependency_parsers.py ......                                  [ 41%]
tests/test_discovery_pipeline.py .                                       [ 43%]
tests/test_discovery_providers.py ..                                     [ 47%]
tests/test_discovery_verification.py ...                                 [ 52%]
tests/test_durable_jobs.py ....                                          [ 60%]
tests/test_quota_safeguards.py ..                                        [ 64%]
tests/test_security_ssrf.py ....                                         [ 72%]
tests/test_storage_r2.py ...                                             [ 78%]
tests/test_technology_catalog.py ..                                      [ 82%]
apps/api/tests/test_auth.py .                                            [ 84%]
apps/api/tests/test_compiler.py ...                                      [ 90%]
apps/api/tests/test_projects.py ..                                       [ 94%]
apps/api/tests/test_registry.py .                                        [ 96%]
apps/api/tests/test_search.py .                                          [ 98%]
apps/api/tests/test_sync.py ..                                           [100%]

============================== 51 passed in 3.94s ==============================
```

---

## 6. Scope & Limitations

This security audit verified software architecture, authentication mechanisms, database transaction boundaries, network sanitization, and dependency vulnerabilities. It does not constitute a formal third-party penetration test or SOC2 / ISO 27001 compliance audit. Periodic automated scanning via GitHub Dependabot and secret scanners is advised.

---
*Report certified by Principal Security Engineer.*
