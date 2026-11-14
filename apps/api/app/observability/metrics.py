from fastapi import APIRouter, Depends, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.database.models import (
    CrawlJob,
    DocumentationPage,
    DocumentationSource,
    SourceSnapshot,
)
from apps.api.app.database.session import get_db

router = APIRouter(tags=["Observability & Metrics"])


@router.get("/api/v1/metrics")
async def prometheus_metrics(db: AsyncSession = Depends(get_db)):
    # Calculate live system metrics
    sources_count = (await db.execute(select(func.count(DocumentationSource.id)))).scalar() or 0
    pages_count = (await db.execute(select(func.count(DocumentationPage.id)))).scalar() or 0
    snapshots_count = (await db.execute(select(func.count(SourceSnapshot.id)))).scalar() or 0
    jobs_completed = (
        await db.execute(select(func.count(CrawlJob.id)).where(CrawlJob.status == "completed"))
    ).scalar() or 0
    jobs_failed = (
        await db.execute(select(func.count(CrawlJob.id)).where(CrawlJob.status == "failed"))
    ).scalar() or 0

    lines = [
        "# HELP devknowledge_sources_total Total number of registered documentation sources.",
        "# TYPE devknowledge_sources_total gauge",
        f"devknowledge_sources_total {sources_count}",
        "",
        "# HELP devknowledge_pages_indexed_total Total number of extracted documentation pages.",
        "# TYPE devknowledge_pages_indexed_total gauge",
        f"devknowledge_pages_indexed_total {pages_count}",
        "",
        "# HELP devknowledge_snapshots_published_total Total number of immutable snapshots published.",
        "# TYPE devknowledge_snapshots_published_total gauge",
        f"devknowledge_snapshots_published_total {snapshots_count}",
        "",
        "# HELP devknowledge_jobs_completed_total Total number of completed crawl and sync jobs.",
        "# TYPE devknowledge_jobs_completed_total counter",
        f"devknowledge_jobs_completed_total {jobs_completed}",
        "",
        "# HELP devknowledge_jobs_failed_total Total number of failed crawl and sync jobs.",
        "# TYPE devknowledge_jobs_failed_total counter",
        f"devknowledge_jobs_failed_total {jobs_failed}",
        "",
    ]

    return Response(content="\n".join(lines), media_type="text/plain; version=0.0.4; charset=utf-8")
