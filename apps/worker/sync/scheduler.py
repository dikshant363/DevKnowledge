from datetime import datetime, timedelta, timezone
from typing import List
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.app.database.models import DocumentationSource, CrawlJob


class SyncScheduler:
    """
    Evaluates source synchronization policies and enqueues scheduled sync jobs.
    """

    @staticmethod
    async def get_sources_due_for_sync(db: AsyncSession) -> List[DocumentationSource]:
        result = await db.execute(
            select(DocumentationSource).where(
                DocumentationSource.status.in_(["active", "idle"])
            )
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
            job = CrawlJob(
                source_id=src.id,
                job_type="incremental_sync",
                status="pending",
                priority=5,
            )
            db.add(job)
            src.status = "queued"
            src.last_checked_at = now
            count += 1

        if count > 0:
            await db.commit()

        return count
