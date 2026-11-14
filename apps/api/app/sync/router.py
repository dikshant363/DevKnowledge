import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import and_, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.auth.security import get_current_user_and_org
from apps.api.app.database.models import (
    DocumentationSource,
    SourceSnapshot,
    SyncEvent,
)
from apps.api.app.database.session import get_db

router = APIRouter(tags=["Version Intelligence & Snapshots"])


class RollbackRequest(BaseModel):
    target_snapshot_id: str


@router.get("/api/v1/snapshots/{snapshot_id}")
async def get_snapshot(
    snapshot_id: str,
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    _, org, _ = user_org
    snap_res = await db.execute(
        select(SourceSnapshot, DocumentationSource)
        .join(DocumentationSource, SourceSnapshot.source_id == DocumentationSource.id)
        .where(
            and_(
                SourceSnapshot.id == snapshot_id,
                DocumentationSource.organization_id == org.id,
            )
        )
    )
    row = snap_res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    snapshot, source = row
    return {
        "id": snapshot.id,
        "source_id": source.id,
        "source_name": source.name,
        "version_number": snapshot.version_number,
        "snapshot_hash": snapshot.snapshot_hash,
        "status": snapshot.status,
        "page_count": snapshot.page_count,
        "compiler_version": snapshot.compiler_version,
        "created_at": snapshot.created_at.isoformat(),
        "published_at": snapshot.published_at.isoformat() if snapshot.published_at else None,
    }


@router.get("/api/v1/snapshots/{snapshot_id}/diff")
async def get_snapshot_diff(
    snapshot_id: str,
    compare_to_snapshot_id: Optional[str] = Query(
        None, description="Previous snapshot to compare against"
    ),
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    _, org, _ = user_org
    snap_res = await db.execute(
        select(SourceSnapshot, DocumentationSource)
        .join(DocumentationSource, SourceSnapshot.source_id == DocumentationSource.id)
        .where(
            and_(
                SourceSnapshot.id == snapshot_id,
                DocumentationSource.organization_id == org.id,
            )
        )
    )
    row = snap_res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    target_snap, source = row

    # Find base snapshot
    if compare_to_snapshot_id:
        base_res = await db.execute(
            select(SourceSnapshot).where(
                and_(
                    SourceSnapshot.id == compare_to_snapshot_id,
                    SourceSnapshot.source_id == source.id,
                )
            )
        )
        base_snap = base_res.scalar_one_or_none()
    else:
        # Find immediate previous version
        prev_res = await db.execute(
            select(SourceSnapshot)
            .where(
                and_(
                    SourceSnapshot.source_id == source.id,
                    SourceSnapshot.version_number < target_snap.version_number,
                )
            )
            .order_by(desc(SourceSnapshot.version_number))
            .limit(1)
        )
        base_snap = prev_res.scalar_one_or_none()

    if not target_snap.manifest_location or not Path(target_snap.manifest_location).exists():
        raise HTTPException(status_code=404, detail="Target snapshot manifest missing")

    target_docs = {
        d["canonical_url"]: d["content_hash"]
        for d in json.loads(Path(target_snap.manifest_location).read_text(encoding="utf-8")).get(
            "documents", []
        )
    }

    base_docs = {}
    if base_snap and base_snap.manifest_location and Path(base_snap.manifest_location).exists():
        base_docs = {
            d["canonical_url"]: d["content_hash"]
            for d in json.loads(Path(base_snap.manifest_location).read_text(encoding="utf-8")).get(
                "documents", []
            )
        }

    added_urls = [url for url in target_docs if url not in base_docs]
    removed_urls = [url for url in base_docs if url not in target_docs]
    modified_urls = [
        url for url in target_docs if url in base_docs and target_docs[url] != base_docs[url]
    ]

    return {
        "target_snapshot_id": target_snap.id,
        "base_snapshot_id": base_snap.id if base_snap else None,
        "added_pages": added_urls,
        "removed_pages": removed_urls,
        "modified_pages": modified_urls,
        "total_changes": len(added_urls) + len(removed_urls) + len(modified_urls),
    }


@router.post("/api/v1/sources/{source_id}/rollback")
async def rollback_source_snapshot(
    source_id: str,
    req: RollbackRequest,
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    _, org, _ = user_org
    source_res = await db.execute(
        select(DocumentationSource).where(
            and_(
                DocumentationSource.id == source_id,
                DocumentationSource.organization_id == org.id,
            )
        )
    )
    source = source_res.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    snap_res = await db.execute(
        select(SourceSnapshot).where(
            and_(
                SourceSnapshot.id == req.target_snapshot_id,
                SourceSnapshot.source_id == source.id,
            )
        )
    )
    target_snapshot = snap_res.scalar_one_or_none()
    if not target_snapshot:
        raise HTTPException(
            status_code=400,
            detail=f"Target snapshot '{req.target_snapshot_id}' does not belong to source or does not exist",
        )

    # Roll back active snapshot pointer
    old_snapshot_id = source.active_snapshot_id
    source.active_snapshot_id = target_snapshot.id
    await db.commit()

    return {
        "source_id": source.id,
        "message": f"Successfully rolled back active snapshot to version {target_snapshot.version_number}",
        "previous_active_snapshot_id": old_snapshot_id,
        "active_snapshot_id": target_snapshot.id,
        "active_version_number": target_snapshot.version_number,
    }


@router.get("/api/v1/sources/{source_id}/changes")
async def get_source_changes(
    source_id: str,
    limit: int = Query(50, ge=1, le=100),
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    _, org, _ = user_org
    source_res = await db.execute(
        select(DocumentationSource).where(
            and_(
                DocumentationSource.id == source_id,
                DocumentationSource.organization_id == org.id,
            )
        )
    )
    source = source_res.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    events_res = await db.execute(
        select(SyncEvent)
        .where(SyncEvent.source_id == source.id)
        .order_by(desc(SyncEvent.detected_at))
        .limit(limit)
    )
    events = events_res.scalars().all()

    return [
        {
            "id": e.id,
            "page_id": e.page_id,
            "classification": e.classification,
            "previous_hash": e.previous_hash,
            "new_hash": e.new_hash,
            "details": e.details,
            "detected_at": e.detected_at.isoformat(),
        }
        for e in events
    ]
