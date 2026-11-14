from datetime import datetime, timedelta, timezone
from typing import List

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.database.models import DocumentationSource
from apps.api.app.jobs.service import JobQueueService
from apps.api.app.quota.tracker import QuotaLimitExceededError

logger = structlog.get_logger()


class SyncScheduler:
    """
    Evaluates source synchronization policies and enqueues scheduled sync jobs.
    """

    @staticmethod
    async def get_sources_due_for_sync(db: AsyncSession) -> List[DocumentationSource]:
        result = await db.execute(
            select(DocumentationSource).where(DocumentationSource.status.in_(["active", "idle"]))
        )
        sources = list(result.scalars().all())
        now = datetime.now(timezone.utc)
        due_sources = []

        for src in sources:
            policy = src.sync_policy or {}
            mode = policy.get("mode", "automatic")
            if mode != "automatic":
                continue

            interval_hours = policy.get("interval_hours", 24)
            last_checked = src.last_checked_at or src.created_at

            # Ensure last_checked has timezone
            if last_checked.tzinfo is None:
                last_checked = last_checked.replace(tzinfo=timezone.utc)

            if now >= last_checked + timedelta(hours=interval_hours):
                due_sources.append(src)

        return due_sources

    @staticmethod
    async def schedule_due_sources(db: AsyncSession) -> int:
        due = await SyncScheduler.get_sources_due_for_sync(db)
        count = 0
        now = datetime.now(timezone.utc)

        for src in due:
            try:
                idempotency_key = f"sync:{src.id}:{now.strftime('%Y%m%d%H')}"
                await JobQueueService.enqueue_job(
                    db=db,
                    source_id=src.id,
                    job_type="incremental_sync",
                    priority=5,
                    idempotency_key=idempotency_key,
                )
                src.status = "queued"
                src.last_checked_at = now
                count += 1
            except QuotaLimitExceededError as e:
                logger.warning(
                    "Skipping sync scheduling due to zero-cost quota safeguard",
                    source_id=src.id,
                    error=str(e),
                )
                break

        if count > 0:
            await db.commit()

        return count
