import time
from typing import Dict

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.cache.adapter import get_cache_adapter
from apps.api.app.config import get_settings
from apps.api.app.database.session import get_db
from apps.api.app.jobs.service import JobQueueService
from apps.api.app.quota.tracker import FreeTierQuotaTracker
from apps.api.app.storage.backend import get_storage_backend

router = APIRouter(tags=["Health & Availability"])


@router.get("/health")
async def health_check():
    """
    Lightweight health check endpoint for Cloudflare Workers / load balancers.
    """
    return {
        "status": "healthy",
        "service": "devknowledge-api",
        "version": "1.0.0",
        "deployment_tier": "zero_cost_free_cloud",
    }


@router.get("/health/details")
async def detailed_health_check(
    db: AsyncSession = Depends(get_db),
):
    """
    Detailed provider status verification across Database (Neon/SQLite),
    Storage (Cloudflare R2/Local), Queue, Cache (Upstash/Memory), and Quota.
    """
    settings = get_settings()
    providers: Dict[str, object] = {}
    is_healthy = True

    # 1. Database Check
    db_start = time.time()
    try:
        await db.execute(text("SELECT 1"))
        db_latency = round((time.time() - db_start) * 1000, 2)
        providers["database"] = {
            "status": "connected",
            "dialect": "postgresql" if "postgresql" in settings.DATABASE_URL else "sqlite",
            "latency_ms": db_latency,
            "ssl_enabled": "ssl" in settings.DATABASE_URL or "postgresql" in settings.DATABASE_URL,
        }
    except Exception as e:
        is_healthy = False
        providers["database"] = {
            "status": "disconnected",
            "error": str(e),
        }

    # 2. Storage Check
    try:
        storage = get_storage_backend()
        usage = await storage.get_total_usage_bytes()
        providers["storage"] = {
            "status": "connected",
            "backend": "cloudflare_r2" if settings.STORAGE_BACKEND.lower() == "r2" else "local",
            "usage_bytes": usage,
            "bucket": settings.R2_BUCKET_NAME if settings.STORAGE_BACKEND.lower() == "r2" else None,
        }
    except Exception as e:
        is_healthy = False
        providers["storage"] = {
            "status": "error",
            "error": str(e),
        }

    # 3. Queue & Lease Status
    try:
        queue_stats = await JobQueueService.get_queue_stats(db)
        providers["job_queue"] = {
            "status": "operational",
            "pending": queue_stats["pending"],
            "active_leases": queue_stats["active_leases"],
            "dead_letter": queue_stats["dead_letter"],
        }
    except Exception as e:
        providers["job_queue"] = {"status": "error", "error": str(e)}

    # 4. Cache Check
    get_cache_adapter()
    cache_backend = "upstash_redis" if settings.UPSTASH_REDIS_REST_URL else "in_memory"
    providers["cache"] = {
        "status": "operational",
        "backend": cache_backend,
    }

    # 5. Quota Report
    quota_report = await FreeTierQuotaTracker.get_quota_report(db)

    # Availability Mode Assessment
    if quota_report["graceful_pause_active"]:
        availability_mode = "QUOTA_PAUSED"
    elif not is_healthy:
        availability_mode = "DEGRADED"
    else:
        availability_mode = "STANDBY_SCHEDULED"

    return {
        "status": "healthy" if is_healthy else "degraded",
        "service": "devknowledge-api",
        "availability_mode": availability_mode,
        "operating_cost": "₹0/month (Free Tier Protected)",
        "providers": providers,
        "quota": quota_report,
        "honest_availability": {
            "guarantee": "Durable jobs and snapshots are preserved in PostgreSQL and R2.",
            "execution": "Crawling occurs via scheduled or dispatched GitHub Actions runners.",
            "notice": "This free-tier deployment is best-effort and does not claim continuous 24/7 background execution when external runners are suspended.",
        },
    }
