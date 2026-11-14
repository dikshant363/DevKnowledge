import os
from datetime import datetime, timezone
from typing import Dict

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.config import get_settings
from apps.api.app.database.models import CrawlJob, DocumentationPage
from apps.api.app.storage.backend import get_storage_backend

logger = structlog.get_logger()


class QuotaLimitExceededError(Exception):
    """Raised when a free-tier quota boundary is exceeded."""

    pass


class FreeTierQuotaTracker:
    """
    Enforces zero-cost infrastructure safeguards across free-tier limits:
    - Neon PostgreSQL: 500 MB
    - Cloudflare R2 Storage: 10 GB
    - Cloudflare Workers: 100,000 reqs/day
    - GitHub Actions: 2,000 runner mins/month
    - Crawl boundaries: max 1,000 pages per source, max 5 depth
    - Retries: max 3 attempts
    """

    _manual_pause: bool = False
    _request_counter_day: str = ""
    _daily_requests: int = 0

    @classmethod
    def record_request(cls):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if cls._request_counter_day != today:
            cls._request_counter_day = today
            cls._daily_requests = 1
        else:
            cls._daily_requests += 1

    @classmethod
    def set_manual_pause(cls, paused: bool):
        cls._manual_pause = paused

    @classmethod
    async def get_database_usage_mb(cls, db: AsyncSession) -> float:
        """
        Estimate database storage usage in Megabytes.
        """
        try:
            # Check SQLite file size if sqlite
            settings = get_settings()
            if "sqlite" in settings.DATABASE_URL:
                db_path = settings.DATABASE_URL.split(":///")[-1]
                if os.path.exists(db_path):
                    return round(os.path.getsize(db_path) / (1024 * 1024), 2)

            # PostgreSQL / Neon size query
            result = await db.execute(select(func.count(DocumentationPage.id)))
            page_count = result.scalar() or 0
            # Rough estimate: ~15KB per indexed documentation page and metadata
            return round((page_count * 15) / 1024, 2)
        except Exception as e:
            logger.warning("Error computing database storage size", error=str(e))
            return 1.0

    @classmethod
    async def get_storage_usage_gb(cls) -> float:
        """
        Compute artifact storage usage in Gigabytes.
        """
        try:
            storage = get_storage_backend()
            bytes_used = await storage.get_total_usage_bytes()
            return round(bytes_used / (1024 * 1024 * 1024), 4)
        except Exception as e:
            logger.warning("Error computing artifact storage size", error=str(e))
            return 0.0

    @classmethod
    async def get_github_runner_minutes(cls, db: AsyncSession) -> int:
        """
        Approximate GitHub Actions crawler execution minutes used this month.
        """
        try:
            now = datetime.now(timezone.utc)
            start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
            result = await db.execute(
                select(CrawlJob).where(
                    CrawlJob.started_at >= start_of_month,
                    CrawlJob.completed_at.is_not(None),
                )
            )
            jobs = result.scalars().all()
            total_seconds = 0
            for j in jobs:
                if j.started_at and j.completed_at:
                    dur = (j.completed_at - j.started_at).total_seconds()
                    total_seconds += max(60, dur)  # GitHub rounds up to full minute
            return int(total_seconds / 60)
        except Exception:
            return 0

    @classmethod
    async def get_quota_report(cls, db: AsyncSession) -> Dict[str, object]:
        settings = get_settings()
        db_mb = await cls.get_database_usage_mb(db)
        storage_gb = await cls.get_storage_usage_gb()
        runner_mins = await cls.get_github_runner_minutes(db)

        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if cls._request_counter_day != today:
            cls._request_counter_day = today
            cls._daily_requests = 1

        db_percent = round((db_mb / settings.FREE_TIER_MAX_STORAGE_MB) * 100, 1)
        r2_percent = round((storage_gb / settings.FREE_TIER_MAX_R2_STORAGE_GB) * 100, 1)
        req_percent = round((cls._daily_requests / settings.FREE_TIER_MAX_DAILY_REQUESTS) * 100, 1)
        gh_percent = round((runner_mins / settings.FREE_TIER_MAX_GITHUB_MINUTES) * 100, 1)

        pause_reasons = []
        if cls._manual_pause:
            pause_reasons.append("Manual administrative pause")
        if settings.FREE_TIER_PAUSE_ON_OVERQUOTA:
            if db_percent >= 90.0:
                pause_reasons.append(
                    f"Database storage approaching Neon free tier limit ({db_percent}%)"
                )
            if r2_percent >= 90.0:
                pause_reasons.append(
                    f"Artifact storage approaching Cloudflare R2 free tier limit ({r2_percent}%)"
                )
            if req_percent >= 95.0:
                pause_reasons.append(f"Daily API request limit reached ({req_percent}%)")
            if gh_percent >= 90.0:
                pause_reasons.append(
                    f"GitHub Actions runner minutes approaching monthly quota ({gh_percent}%)"
                )

        is_paused = len(pause_reasons) > 0

        return {
            "graceful_pause_active": is_paused,
            "pause_reasons": pause_reasons,
            "quotas": {
                "neon_database": {
                    "used_mb": db_mb,
                    "limit_mb": settings.FREE_TIER_MAX_STORAGE_MB,
                    "usage_percent": db_percent,
                },
                "cloudflare_r2": {
                    "used_gb": storage_gb,
                    "limit_gb": settings.FREE_TIER_MAX_R2_STORAGE_GB,
                    "usage_percent": r2_percent,
                },
                "cloudflare_workers_requests": {
                    "used_today": cls._daily_requests,
                    "limit_daily": settings.FREE_TIER_MAX_DAILY_REQUESTS,
                    "usage_percent": req_percent,
                },
                "github_actions_minutes": {
                    "used_monthly": runner_mins,
                    "limit_monthly": settings.FREE_TIER_MAX_GITHUB_MINUTES,
                    "usage_percent": gh_percent,
                },
            },
            "safeguards": {
                "max_pages_per_source": settings.MAX_PAGES_PER_SOURCE,
                "max_attempts": settings.MAX_JOB_ATTEMPTS,
                "lease_seconds": settings.JOB_LEASE_SECONDS,
                "pause_on_overquota": settings.FREE_TIER_PAUSE_ON_OVERQUOTA,
            },
            "operating_cost_target": "₹0/month (Free Tier Protected)",
        }

    @classmethod
    async def assert_can_enqueue_job(cls, db: AsyncSession):
        """
        Ensures scheduling a new crawl job will not violate free-tier thresholds.
        """
        report = await cls.get_quota_report(db)
        if report["graceful_pause_active"]:
            reasons = "; ".join(report["pause_reasons"])
            raise QuotaLimitExceededError(
                f"Work scheduling is gracefully paused to prevent paid infrastructure charges: {reasons}"
            )
