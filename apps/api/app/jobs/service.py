from datetime import datetime, timedelta, timezone
from typing import Optional

import structlog
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.config import get_settings
from apps.api.app.database.models import CrawlJob
from apps.api.app.quota.tracker import FreeTierQuotaTracker

logger = structlog.get_logger()


class JobQueueService:
    """
    Durable PostgreSQL-backed Job Queue Service.
    Guarantees:
    - Atomic job claiming with transactional locking
    - Lease-based execution with worker heartbeats
    - Exponential backoff retry and dead-letter handling
    - Idempotent duplicate job execution prevention
    - Recovery of abandoned or stalled worker leases
    """

    @classmethod
    async def enqueue_job(
        cls,
        db: AsyncSession,
        source_id: str,
        job_type: str = "full_crawl",
        priority: int = 0,
        idempotency_key: Optional[str] = None,
        scheduled_at: Optional[datetime] = None,
        max_attempts: int = 3,
    ) -> CrawlJob:
        # Enforce zero-cost quota safeguard before enqueueing
        await FreeTierQuotaTracker.assert_can_enqueue_job(db)

        # 1. Duplicate execution protection via idempotency key
        if idempotency_key:
            existing = await db.execute(
                select(CrawlJob).where(CrawlJob.idempotency_key == idempotency_key)
            )
            job = existing.scalar_one_or_none()
            if job:
                logger.info(
                    "Job already enqueued with idempotency key, returning existing job",
                    idempotency_key=idempotency_key,
                    job_id=job.id,
                )
                return job

        sched_time = scheduled_at or datetime.now(timezone.utc)
        job = CrawlJob(
            source_id=source_id,
            job_type=job_type,
            status="pending",
            priority=priority,
            idempotency_key=idempotency_key,
            scheduled_at=sched_time,
            max_attempts=max_attempts,
            attempt_count=0,
            progress=0.0,
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)
        logger.info(
            "Enqueued durable job", job_id=job.id, source_id=source_id, scheduled_at=sched_time
        )
        return job

    @classmethod
    async def claim_next_job(
        cls,
        db: AsyncSession,
        worker_id: str,
        lease_seconds: int = 600,
    ) -> Optional[CrawlJob]:
        """
        Atomically claims the highest-priority pending or expired-lease job.
        Uses FOR UPDATE SKIP LOCKED on PostgreSQL; uses atomic transaction on SQLite.
        """
        now = datetime.now(timezone.utc)
        settings = get_settings()

        # Eligible condition:
        # 1. Pending jobs scheduled on or before now
        # 2. Leased jobs whose lease expired before now (abandoned job recovery)
        eligible_filter = or_(
            and_(CrawlJob.status == "pending", CrawlJob.scheduled_at <= now),
            and_(CrawlJob.status == "leased", CrawlJob.lease_expires_at < now),
        )

        query = (
            select(CrawlJob)
            .where(eligible_filter)
            .order_by(CrawlJob.priority.desc(), CrawlJob.scheduled_at.asc())
            .limit(1)
        )

        # Apply transactional row-locking if PostgreSQL
        if "postgresql" in settings.DATABASE_URL:
            query = query.with_for_update(skip_locked=True)

        res = await db.execute(query)
        job = res.scalar_one_or_none()
        if not job:
            return None

        # Atomically grant lease
        job.status = "leased"
        job.worker_id = worker_id
        job.started_at = now
        job.heartbeat_at = now
        job.lease_expires_at = now + timedelta(seconds=lease_seconds)
        job.attempt_count += 1

        await db.commit()
        await db.refresh(job)
        logger.info(
            "Claimed durable job",
            job_id=job.id,
            worker_id=worker_id,
            attempt=job.attempt_count,
            lease_expires_at=job.lease_expires_at,
        )
        return job

    @classmethod
    async def record_heartbeat(
        cls,
        db: AsyncSession,
        job_id: str,
        worker_id: str,
        extend_seconds: int = 600,
    ) -> bool:
        """
        Updates the lease expiration and heartbeat timestamp for an active job.
        """
        res = await db.execute(select(CrawlJob).where(CrawlJob.id == job_id))
        job = res.scalar_one_or_none()
        if not job:
            return False

        if job.status not in ("leased", "running"):
            logger.warning(
                "Heartbeat rejected: job not in leased/running state",
                job_id=job_id,
                status=job.status,
            )
            return False

        if job.worker_id and job.worker_id != worker_id:
            logger.warning(
                "Heartbeat rejected: worker mismatch",
                job_id=job_id,
                expected=job.worker_id,
                actual=worker_id,
            )
            return False

        now = datetime.now(timezone.utc)
        job.heartbeat_at = now
        job.lease_expires_at = now + timedelta(seconds=extend_seconds)
        await db.commit()
        return True

    @classmethod
    async def complete_job(
        cls,
        db: AsyncSession,
        job_id: str,
        worker_id: str,
        pages_processed: int = 0,
        pages_failed: int = 0,
    ) -> Optional[CrawlJob]:
        """
        Marks a claimed job as completed.
        """
        res = await db.execute(select(CrawlJob).where(CrawlJob.id == job_id))
        job = res.scalar_one_or_none()
        if not job:
            return None

        now = datetime.now(timezone.utc)
        job.status = "completed"
        job.progress = 1.0
        job.pages_processed = pages_processed
        job.pages_failed = pages_failed
        job.completed_at = now
        job.lease_expires_at = None
        await db.commit()
        await db.refresh(job)
        logger.info("Completed durable job", job_id=job.id, pages_processed=pages_processed)
        return job

    @classmethod
    async def fail_job(
        cls,
        db: AsyncSession,
        job_id: str,
        worker_id: str,
        error_message: str,
        error_details: Optional[str] = None,
    ) -> Optional[CrawlJob]:
        """
        Handles job failure with exponential backoff retry or routes to dead_letter.
        """
        res = await db.execute(select(CrawlJob).where(CrawlJob.id == job_id))
        job = res.scalar_one_or_none()
        if not job:
            return None

        now = datetime.now(timezone.utc)
        job.error_summary = error_message
        job.error_details = error_details
        job.lease_expires_at = None

        if job.attempt_count >= job.max_attempts:
            # Maximum retry budget exhausted -> route to dead_letter
            job.status = "dead_letter"
            job.completed_at = now
            logger.error(
                "Job reached maximum retry attempts, marked as dead_letter",
                job_id=job.id,
                attempts=job.attempt_count,
            )
        else:
            # Exponential backoff retry: 30s, 60s, 120s...
            backoff_sec = min(3600, 30 * (2 ** (job.attempt_count - 1)))
            job.status = "pending"
            job.scheduled_at = now + timedelta(seconds=backoff_sec)
            logger.info(
                "Rescheduling job with exponential backoff",
                job_id=job.id,
                next_attempt=job.attempt_count + 1,
                delay=backoff_sec,
            )

        await db.commit()
        await db.refresh(job)
        return job

    @classmethod
    async def cancel_job(
        cls,
        db: AsyncSession,
        job_id: str,
        reason: str = "Cancelled by user",
    ) -> Optional[CrawlJob]:
        """
        Cancels a pending or active job.
        """
        res = await db.execute(select(CrawlJob).where(CrawlJob.id == job_id))
        job = res.scalar_one_or_none()
        if not job:
            return None

        job.status = "cancelled"
        job.error_summary = reason
        job.completed_at = datetime.now(timezone.utc)
        job.lease_expires_at = None
        await db.commit()
        await db.refresh(job)
        logger.info("Cancelled durable job", job_id=job.id, reason=reason)
        return job

    @classmethod
    async def recover_abandoned_jobs(
        cls,
        db: AsyncSession,
    ) -> int:
        """
        Finds all expired-lease jobs and re-queues them or moves to dead_letter if attempts exhausted.
        """
        now = datetime.now(timezone.utc)
        res = await db.execute(
            select(CrawlJob).where(
                and_(
                    CrawlJob.status == "leased",
                    CrawlJob.lease_expires_at < now,
                )
            )
        )
        abandoned_jobs = res.scalars().all()
        recovered_count = 0

        for job in abandoned_jobs:
            if job.attempt_count >= job.max_attempts:
                job.status = "dead_letter"
                job.error_summary = "Lease expired and max attempts exceeded"
            else:
                job.status = "pending"
                job.scheduled_at = now
            job.lease_expires_at = None
            recovered_count += 1

        if recovered_count > 0:
            await db.commit()
            logger.info("Recovered abandoned leased jobs", count=recovered_count)

        return recovered_count

    @classmethod
    async def get_queue_stats(cls, db: AsyncSession) -> dict:
        """
        Returns full queue metrics and health indicators.
        """
        now = datetime.now(timezone.utc)
        statuses = ["pending", "leased", "completed", "failed", "dead_letter", "cancelled"]
        counts = {}

        for s in statuses:
            r = await db.execute(select(func.count(CrawlJob.id)).where(CrawlJob.status == s))
            counts[s] = r.scalar() or 0

        tot_res = await db.execute(select(func.count(CrawlJob.id)))
        counts["total"] = tot_res.scalar() or 0

        # Active valid leases
        leases_res = await db.execute(
            select(func.count(CrawlJob.id)).where(
                and_(CrawlJob.status == "leased", CrawlJob.lease_expires_at >= now)
            )
        )
        counts["active_leases"] = leases_res.scalar() or 0

        # Overdue pending
        overdue_res = await db.execute(
            select(func.count(CrawlJob.id)).where(
                and_(CrawlJob.status == "pending", CrawlJob.scheduled_at <= now)
            )
        )
        counts["overdue_pending"] = overdue_res.scalar() or 0

        return counts
