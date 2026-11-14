from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.app.auth.security import get_current_user_and_org
from apps.api.app.database.models import CrawlJob, DocumentationPage
from apps.api.app.database.session import get_db
from apps.api.app.registry.schemas import (
    SourceCreate,
    SourceListResponse,
    SourceResponse,
    SourceStatusResponse,
    SourceUpdate,
)
from apps.api.app.registry.service import SourceRegistryService

router = APIRouter(prefix="/sources", tags=["Documentation Sources"])


@router.post("", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def register_source(
    data: SourceCreate,
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    _, org, _ = user_org
    source = await SourceRegistryService.create_source(db, org.id, data)
    return source


@router.get("", response_model=SourceListResponse)
async def list_sources(
    category: Optional[str] = Query(None, description="Filter by technology category"),
    q: Optional[str] = Query(None, description="Search by name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    _, org, _ = user_org
    items, total = await SourceRegistryService.list_sources(
        db, org.id, category=category, query=q, skip=skip, limit=limit
    )
    return SourceListResponse(items=items, total=total)


@router.get("/{source_id}", response_model=SourceResponse)
async def get_source(
    source_id: str,
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    _, org, _ = user_org
    source = await SourceRegistryService.get_source(db, org.id, source_id)
    return source


@router.patch("/{source_id}", response_model=SourceResponse)
async def update_source(
    source_id: str,
    data: SourceUpdate,
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    _, org, _ = user_org
    source = await SourceRegistryService.update_source(db, org.id, source_id, data)
    return source


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_source(
    source_id: str,
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    _, org, _ = user_org
    await SourceRegistryService.delete_source(db, org.id, source_id)


@router.get("/{source_id}/status", response_model=SourceStatusResponse)
async def get_source_status(
    source_id: str,
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    _, org, _ = user_org
    source = await SourceRegistryService.get_source(db, org.id, source_id)

    # Count indexed pages
    page_count_res = await db.execute(
        select(func.count(DocumentationPage.id)).where(
            and_(
                DocumentationPage.source_id == source.id,
                DocumentationPage.page_status == "indexed",
            )
        )
    )
    pages_count = page_count_res.scalar() or 0

    # Get latest crawl job
    job_res = await db.execute(
        select(CrawlJob)
        .where(CrawlJob.source_id == source.id)
        .order_by(CrawlJob.started_at.desc().nullslast())
        .limit(1)
    )
    latest_job = job_res.scalar_one_or_none()

    return SourceStatusResponse(
        source_id=source.id,
        status=source.status,
        active_snapshot_id=source.active_snapshot_id,
        pages_indexed=pages_count,
        last_checked_at=source.last_checked_at,
        last_successful_sync_at=source.last_successful_sync_at,
        latest_job_id=latest_job.id if latest_job else None,
        job_progress=latest_job.progress if latest_job else 0.0,
    )


@router.post("/{source_id}/sync", status_code=status.HTTP_202_ACCEPTED)
async def trigger_sync(
    source_id: str,
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    _, org, _ = user_org
    source = await SourceRegistryService.get_source(db, org.id, source_id)

    # Schedule incremental sync job
    job = CrawlJob(
        source_id=source.id,
        job_type="incremental_sync",
        status="pending",
        priority=20,
    )
    db.add(job)
    source.status = "queued"
    await db.commit()

    return {
        "source_id": source.id,
        "job_id": job.id,
        "status": "queued",
        "message": "Synchronization job queued successfully",
    }
