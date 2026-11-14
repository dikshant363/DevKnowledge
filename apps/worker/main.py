import asyncio

import structlog
from sqlalchemy import select

from apps.api.app.database.models import CrawlJob, DocumentationSource
from apps.api.app.database.session import AsyncSessionLocal
from apps.worker.crawler.engine import CrawlEngine

logger = structlog.get_logger()


async def process_pending_jobs():
    engine = CrawlEngine()

    async with AsyncSessionLocal() as db:
        # Fetch highest priority pending crawl job
        result = await db.execute(
            select(CrawlJob)
            .where(CrawlJob.status == "pending")
            .order_by(CrawlJob.priority.desc(), CrawlJob.started_at.asc())
            .limit(1)
        )
        job = result.scalar_one_or_none()
        if not job:
            return False

        source_res = await db.execute(
            select(DocumentationSource).where(DocumentationSource.id == job.source_id)
        )
        source = source_res.scalar_one_or_none()
        if not source:
            job.status = "failed"
            job.error_summary = "Source not found"
            await db.commit()
            return True

        logger.info("Executing crawl job", job_id=job.id, source=source.name, url=source.root_url)
        processed = await engine.crawl_source(db, source, job)
        logger.info("Completed crawl job", job_id=job.id, pages_indexed=processed)
        return True


async def worker_loop():
    logger.info("Starting DevKnowledge Crawler Worker...")
    while True:
        try:
            handled = await process_pending_jobs()
            if not handled:
                await asyncio.sleep(2)
        except Exception as e:
            logger.error("Error in worker loop", error=str(e))
            await asyncio.sleep(5)


if __name__ == "__main__":
    asyncio.run(worker_loop())
