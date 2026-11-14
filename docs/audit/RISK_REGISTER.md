# DevKnowledge — Enterprise Risk Register

**Document:** `docs/audit/RISK_REGISTER.md`  
**Date:** November 14, 2026  
**Auditor / Security Architect:** Backend Infrastructure & Security Agent (`@auditor_backend`)  
**Scope:** Architecture, Security, Operational, and Data Protection Risks  
**Branch:** `audit/devknowledge-hardening-and-ui`  
**Version:** 1.0 (Hardened Baseline)  

---

## 1. Risk Scoring Methodology

Risks are evaluated using a 5x5 Inherent and Residual Risk scoring matrix based on ISO 31000 / NIST SP 800-30 standards:

- **Likelihood (1–5):** 1 = Rare, 2 = Unlikely, 3 = Moderate, 4 = Likely, 5 = Almost Certain
- **Impact (1–5):** 1 = Negligible, 2 = Minor, 3 = Moderate, 4 = Major, 5 = Critical / Catastrophic
- **Risk Score = Likelihood × Impact**
  - **15 – 25:** **Critical (P0)** — Immediate remediation mandatory before production release.
  - **10 – 14:** **High (P1)** — Hardening required within active sprint.
  - **5 – 9:** **Medium (P2)** — Scheduled remediation or acceptable operational risk.
  - **1 – 4:** **Low (P3)** — Informational / standard maintenance.

---

## 2. Risk Register Matrix

| Risk ID | Category | Risk Description & Threat Scenario | Inherent (L x I = Score) | Mitigation & Defense-in-Depth Controls | Residual (L x I = Score) | Owner | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RISK-SEC-001** | Data Protection | **Supabase PostgREST Anonymous Data Exposure**: Public schema tables lack RLS, allowing anyone with the anon key to read `users` (password hashes) and application data. | 5 × 5 = **25 (Critical)** | Execute RLS lockdown script in Supabase SQL editor (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) and revoke public schema usage from `anon` & `authenticated`. | 1 × 4 = **4 (Low)** | SecOps / DBA | Documented (Action Required in Supabase) |
| **RISK-SEC-002** | Access Control | **Durable Queue Hijacking**: `authenticate_runner_or_user` previously defaulted to `local` unauthenticated mode, allowing rogue actors to claim, complete, or fail jobs. | 4 × 5 = **20 (Critical)** | Implemented constant-time `hmac.compare_digest` for runner keys, JWT token verification, and restricted bypass exclusively to `testing` environments. | 1 × 2 = **2 (Low)** | Backend Team | **MITIGATED & TESTED** |
| **RISK-SEC-003** | Denial of Wallet | **Cloudflare Gateway Unauthenticated Workflow Dispatch**: Unauthenticated POST requests to `/api/v1/sync/dispatch` could trigger repeated GitHub Actions runs and exhaust free runner minutes. | 3 × 5 = **15 (Critical)** | Added mandatory `Authorization: Bearer <RUNNER_API_KEY>` / `X-Runner-Key` verification in `apps/cloudflare-worker/src/index.ts`. | 1 × 2 = **2 (Low)** | Edge Infra | **MITIGATED & TESTED** |
| **RISK-SEC-004** | Network / SSRF | **Crawler DNS Rebinding (TOCTOU)**: Time-of-check to time-of-use window between DNS validation in `SSRFValidator` and socket creation in `httpx`. | 2 × 4 = **8 (Medium)** | `SafeHTTPClient` disables automatic redirects (`follow_redirects=False`), re-validates redirect URLs, and blocks private/loopback/cloud metadata IP ranges. | 1 × 3 = **3 (Low)** | Crawler Team | **MITIGATED** |
| **RISK-DB-001** | Availability | **PostgreSQL Connection Exhaustion & Stale Sockets**: Supabase free tier drops idle connections and caps at 60 connections. Lacking pre-ping led to 500 errors. | 4 × 4 = **16 (Critical)** | Configured `pool_pre_ping=True`, `pool_recycle=300`, `pool_size=10`, `max_overflow=20`, and `pool_timeout=30` in SQLAlchemy engine. | 1 × 2 = **2 (Low)** | Backend Team | **MITIGATED & TESTED** |
| **RISK-CWL-001** | Reliability | **Crawler Silent Failures**: When all page scrapes failed, the crawler marked jobs `completed` rather than `failed`, breaking automated retry and dead-letter queues. | 4 × 3 = **12 (High)** | Added zero-page failure assertion raising `RuntimeError`, updating `job.status = 'failed'` and `source.status = 'error'` to trigger durable queue retry. | 1 × 2 = **2 (Low)** | Worker Team | **MITIGATED & TESTED** |
| **RISK-OPS-001** | Cost / Quota | **Free-Tier Quota Safeguard Bypass**: Direct database instantiation of `CrawlJob` in sync scheduler bypassed storage and runner minute assertions. | 4 × 4 = **16 (Critical)** | Refactored `SyncScheduler` to use `JobQueueService.enqueue_job` with hourly idempotency keys and graceful `QuotaLimitExceededError` handling. | 1 × 3 = **3 (Low)** | Worker Team | **MITIGATED & TESTED** |
| **RISK-AUTH-001** | Authentication | **Production Auto-Login with Development Credentials**: If `ENVIRONMENT` defaulted to `development` on public hosts, unauthenticated requests attained full owner permissions. | 4 × 5 = **20 (Critical)** | Restricted dev fallback strictly to non-production environments and hardened organization membership null check in `get_current_user_and_org`. | 1 × 3 = **3 (Low)** | Backend Team | **MITIGATED & TESTED** |

---

## 3. Risk Treatment Plan & Ongoing Governance

### 3.1 Pre-Release Blockers (P0 Gate)
1. **Supabase PostgREST Lockdown (RISK-SEC-001):** Must be executed via Supabase Management Console SQL Editor prior to public production traffic.
2. **Secret Management:** Verify that `RUNNER_API_KEY`, `SECRET_KEY`, and `SUPABASE_KEY` are provisioned via Cloudflare Worker secrets and GitHub repository secrets. Never commit live secrets to git.

### 3.2 Continuous Monitoring & Telemetry
1. **Prometheus Metrics (`/api/v1/metrics`):** Track `devknowledge_crawler_jobs_failed_total` and `devknowledge_queue_depth` for abnormal spikes.
2. **Quota Tracker (`/api/v1/quota`):** Ensure `FREE_TIER_PAUSE_ON_OVERQUOTA=True` remains active to prevent any unplanned cloud billing.
3. **Cloudflare Worker Rate Limiting:** In-memory sliding window rate limiter protects endpoints against DDoS and high-concurrency brute force attacks.
