# DevKnowledge — Free-Cloud Zero-Cost Deployment Guide (₹0/Month)

This guide documents the production deployment of **DevKnowledge** targeting **₹0/month operating cost** using free cloud tiers and open-source infrastructure. The architecture eliminates permanently running paid servers while maintaining durable job queues, cryptographic snapshot verification, and automatic synchronization.

---

## 1. Zero-Cost Infrastructure Architecture

```
                  ┌────────────────────────────────────────────────────────┐
                  │               USER & AGENT REQUESTS                    │
                  └──────────────────────────┬─────────────────────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       │                                           │
                       ▼                                           ▼
          ┌─────────────────────────┐                 ┌─────────────────────────┐
          │     Cloudflare Pages    │                 │   Cloudflare Workers    │
          │   (Next.js Static UI)   │                 │ (API Gateway & Cron)    │
          │  Free: Unlimited egress │                 │  Free: 100k req/day     │
          └─────────────────────────┘                 └────────────┬────────────┘
                                                                   │
                                ┌──────────────────────────────────┤
                                │ Cron: */15 * * * *               │ Lightweight API
                                │ Dispatch: repository_dispatch    │
                                ▼                                  ▼
          ┌───────────────────────────────┐           ┌───────────────────────────────┐
          │      GitHub Actions Runner    │           │       Neon PostgreSQL         │
          │     (Ephemeral Playwright     │           │ (Serverless Metadata & Queue) │
          │      Crawler Execution)       │           │   Free: 0.5 GiB / Pooled SSL  │
          │ Free: 2,000 mins/mo (private) │           └──────────────┬────────────────┘
          │       Unlimited (public)      │                          │
          └───────────────┬───────────────┘                          │
                          │                                          │
                          ▼ Put Artifacts                            ▼ Read CKR Chunks
          ┌───────────────────────────────┐           ┌───────────────────────────────┐
          │        Cloudflare R2          │           │     Optional Upstash Redis    │
          │ (S3 Snapshot & Release Bucket)│           │ (Serverless Cache & Rate Limit│
          │ Free: 10 GB / 1M Class A ops  │           │ Free: 10k commands/day        │
          └───────────────────────────────┘           └───────────────────────────────┘
```

### Approved Free-Tier Provider Allocations

| Component | Free Cloud Provider | Free-Tier Quota Limit | Role & Safeguards |
|---|---|---|---|
| **Frontend Console** | **Cloudflare Pages** | Unlimited requests & bandwidth | Pre-rendered static dashboard (`apps/web/out`). |
| **Edge API Gateway** | **Cloudflare Workers** | 100,000 requests/day, 50ms CPU | Lightweight routing, health checks, sliding-window rate limiting. |
| **Sync Scheduler** | **Cloudflare Cron Triggers** | Unlimited invocations (`*/15 * * * *`) | Inspects sync policies, enqueues pending jobs, dispatches GitHub Actions runner. |
| **Durable Metadata & Queue** | **Neon PostgreSQL** | 500 MB storage, connection pooling | Relational data, tenant isolation, full-text indexes, atomic job queue. |
| **Artifact & Snapshot Storage** | **Cloudflare R2** | 10 GB storage, 1M Class A, 10M Class B ops/mo | Immutable CKR releases (`llms.txt`, `AGENTS.md`, `SKILL.md`, `manifest.json`). |
| **Crawler & Browser Execution** | **GitHub Actions** | 2,000 runner minutes/mo (private), Unlimited (public) | Ephemeral Ubuntu runners executing Playwright Chromium, safe client, and compiler. |
| **Acceleration Cache** *(Optional)* | **Upstash Redis** | 10,000 commands/day, 256 MB storage | Transparent HTTP REST key-value cache fallback. |

---

## 2. Durable Job Queue Architecture

To prevent race conditions, stalled workers, and duplicate crawl jobs without paying for dedicated Celery/RabbitMQ instances, DevKnowledge implements a **PostgreSQL-backed durable job queue** with row-level locking.

### Job Lifecycle State Machine

```
   ┌─────────┐   Scheduled Time / Manual
   │ PENDING ├───────────────────────────────┐
   └────┬────┘                               │
        │ Atomic Claim                       │
        │ (FOR UPDATE SKIP LOCKED)           │
        ▼                                    ▼
   ┌─────────┐   Every 30s             ┌───────────┐
   │ LEASED  ├────────────────────────►│ CANCELLED │
   └────┬────┘   (Extends Expiry)      └───────────┘
        │                                    ▲
        │ Crawler Loop                       │ User Action
        ▼                                    │
   ┌─────────┐   Attempt < Max Attempts      │
   │ FAILED  ├───────────────────────────────┤
   └────┬────┘   (Exponential Backoff Retry) │
        │                                    │
        │ Attempt >= Max Attempts            │
        ▼                                    │
   ┌─────────────┐                           │
   │ DEAD_LETTER ├───────────────────────────┘
   └─────────────┘
```

### Core Guarantees
1. **Atomic Job Claiming:** Workers claim jobs via `SELECT ... FOR UPDATE SKIP LOCKED` (PostgreSQL) or atomic transaction (SQLite). Only one runner can lease a given job.
2. **Lease-Based Execution:** Leases default to 600 seconds. Active runners transmit background heartbeats (`POST /api/v1/jobs/{id}/heartbeat`) every 30 seconds to extend the lease.
3. **Abandoned Job Recovery:** If a runner crashes or GitHub cancels a job, its lease expires. The next scheduled poll or explicit recovery call automatically re-claims the job.
4. **Exponential Backoff:** Transient network failures trigger exponential retry delays (`delay = 30s * 2^(attempt - 1)`).
5. **Dead-Letter Handling:** After 3 attempts (`MAX_JOB_ATTEMPTS`), jobs transition to `dead_letter` for manual inspection.
6. **Duplicate Execution Protection:** Unique `idempotency_key` constraint guarantees that identical sync requests do not produce duplicate jobs.

---

## 3. Step-by-Step Zero-Cost Deployment

### Step 1: Provision Free Neon PostgreSQL Database
1. Create a free account at [neon.tech](https://neon.tech).
2. Create a new project (e.g., `devknowledge-prod`) and select your nearest region.
3. Copy the pooled connection string with SSL:
   ```env
   DATABASE_URL="postgresql+asyncpg://<user>:<password>@<ep-pooler>.neon.tech/neondb?ssl=require"
   DATABASE_URL_SYNC="postgresql+psycopg://<user>:<password>@<ep-pooler>.neon.tech/neondb?ssl=require"
   ```
4. Run schema migrations from your local terminal:
   ```bash
   uv run alembic upgrade head
   ```

### Step 2: Configure Free Cloudflare R2 Storage
1. In Cloudflare Dashboard, navigate to **R2** and click **Create Bucket**.
2. Name the bucket `devknowledge-artifacts`.
3. Go to **R2 Manage API Tokens** -> **Create API Token** with `Object Read & Write` permissions.
4. Note your credentials:
   - Account ID
   - Access Key ID
   - Secret Access Key
   - Endpoint URL: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

### Step 3: Deploy Frontend to Cloudflare Pages
1. Build the static pages export:
   ```bash
   pnpm --filter @devknowledge/web build:pages
   ```
2. Deploy to Cloudflare Pages:
   ```bash
   npx wrangler pages deploy apps/web/out --project-name=devknowledge-console
   ```
3. Set the environment variable `NEXT_PUBLIC_API_URL` to your Cloudflare Worker Gateway URL.

### Step 4: Deploy Cloudflare Worker API Gateway
1. Navigate to `apps/cloudflare-worker/`:
   ```bash
   cd apps/cloudflare-worker
   ```
2. Configure required production secrets:
   ```bash
   npx wrangler secret put GITHUB_TOKEN
   npx wrangler secret put RUNNER_API_KEY
   npx wrangler secret put NEON_DATABASE_URL
   ```
3. Deploy the worker:
   ```bash
   npx wrangler deploy
   ```
   *The Cron Trigger `crons = ["*/15 * * * *"]` is automatically activated.*

### Step 5: Configure GitHub Actions Runner Secrets
In your GitHub repository, go to **Settings** -> **Secrets and variables** -> **Actions** and add:
- `DEVKNOWLEDGE_API_URL`: URL of your deployed FastAPI service or Cloudflare Worker Gateway.
- `DATABASE_URL`: Neon PostgreSQL async connection string.
- `DATABASE_URL_SYNC`: Neon PostgreSQL sync connection string.
- `RUNNER_API_KEY`: Secret matching the API runner authorization key.
- `STORAGE_BACKEND`: `r2`
- `R2_ACCOUNT_ID`: Cloudflare Account ID
- `R2_ACCESS_KEY_ID`: Cloudflare R2 Access Key ID
- `R2_SECRET_ACCESS_KEY`: Cloudflare R2 Secret Access Key
- `R2_BUCKET_NAME`: `devknowledge-artifacts`
- `UPSTASH_REDIS_REST_URL`: *(Optional)* Upstash REST URL.
- `UPSTASH_REDIS_REST_TOKEN`: *(Optional)* Upstash REST Bearer Token.

---

## 4. Zero-Cost Safeguards & Quota Tracking

DevKnowledge proactively monitors resource consumption to prevent accidental billing transitions:

```bash
# Query active quota usage and safeguard status
curl -H "Authorization: Bearer <TOKEN>" https://<API_URL>/api/v1/quota/status
```

### Free-Tier Boundaries Enforced
- **Neon Database Ceiling:** 500 MB (Automatically triggers graceful pause at 90% capacity).
- **Cloudflare R2 Ceiling:** 10 GB (Safeguard prevents new crawls if bucket exceeds 9 GB).
- **Daily Request Limiter:** 100,000 requests/day per Cloudflare Worker free tier.
- **Max Crawl Pages:** Hard ceiling of 1,000 pages per documentation source.
- **Max Crawl Depth:** Default 5 levels.
- **Job Timeout:** GitHub Actions jobs terminate automatically after 25 minutes to avoid runner waste.

### Administrative Overrides
```bash
# Manually pause all background crawling and synchronization
curl -X POST -H "Authorization: Bearer <TOKEN>" https://<API_URL>/api/v1/quota/pause

# Resume execution
curl -X POST -H "Authorization: Bearer <TOKEN>" https://<API_URL>/api/v1/quota/resume
```

---

## 5. Operational Reliability & Disaster Recovery

### Cryptographic Snapshot Verification
Artifacts and snapshots stored in Cloudflare R2 are cryptographically verified using SHA-256 checksums:
```bash
curl -H "Authorization: Bearer <TOKEN>" https://<API_URL>/api/v1/sources/<SOURCE_ID>/artifacts
```

### Database Backup & R2 Mirroring
Run the backup script locally or as a scheduled GitHub Action:
```bash
# Back up database and upload SHA-256 verified archive to Cloudflare R2
./infrastructure/backup/neon_r2_backup.sh backup

# Restore from a backup archive
./infrastructure/backup/neon_r2_backup.sh restore ./storage/backups/devknowledge_pg_20261114.sql.gz
```

### GitHub Actions Scheduled Inactivity Policy
GitHub automatically pauses scheduled workflows (`cron`) on public repositories after **60 days of repository inactivity**.  
**Mitigations implemented:**
1. **Cloudflare Worker Dispatcher:** Cloudflare Cron Triggers call `POST https://api.github.com/repos/{owner}/{repo}/dispatches` via `repository_dispatch`. API dispatches are never disabled by inactivity.
2. **Workflow Dispatch:** You can manually dispatch crawl jobs anytime from the GitHub Actions web UI or via:
   ```bash
   gh workflow run crawler-runner.yml -f source_id="<SOURCE_ID>"
   ```

---

## 6. Honest Availability Declaration

> **Notice:** The zero-cost configuration is an honest, best-effort hobby deployment designed for developers, small teams, and open-source projects.
> - **Durable Data Preservation:** All documentation, API symbols, code examples, snapshots, and job records are durably persisted in Neon PostgreSQL and Cloudflare R2. Data is never lost if a runner goes offline.
> - **Runner Availability:** Crawler execution occurs on-demand or during scheduled intervals (every 15–30 minutes). DevKnowledge does not claim continuous 24/7 worker uptime when GitHub Actions runners or free-tier quotas are temporarily suspended.
