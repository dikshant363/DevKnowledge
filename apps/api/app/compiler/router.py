import json
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.app.auth.security import get_current_user_and_org
from apps.api.app.database.session import get_db
from apps.api.app.database.models import (
    DocumentationSource,
    SourceSnapshot,
    GeneratedArtifact,
)
from apps.api.app.compiler.pipeline import CompilerPipeline

router = APIRouter(prefix="/sources", tags=["Knowledge Compiler"])


@router.post("/{source_id}/compile", status_code=status.HTTP_201_CREATED)
async def compile_source(
    source_id: str,
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

    snapshot = await CompilerPipeline.compile_source_snapshot(db, source)
    return {
        "message": "Snapshot successfully compiled and atomically published",
        "snapshot_id": snapshot.id,
        "version_number": snapshot.version_number,
        "page_count": snapshot.page_count,
        "snapshot_hash": snapshot.snapshot_hash,
    }


@router.get("/{source_id}/manifest")
async def get_source_manifest(
    source_id: str,
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

    if not source.active_snapshot_id:
        raise HTTPException(status_code=404, detail="No active snapshot published yet")

    snap_res = await db.execute(
        select(SourceSnapshot).where(SourceSnapshot.id == source.active_snapshot_id)
    )
    snapshot = snap_res.scalar_one_or_none()
    if not snapshot or not snapshot.manifest_location or not Path(snapshot.manifest_location).exists():
        raise HTTPException(status_code=404, detail="Manifest file not found on disk")

    manifest_json = Path(snapshot.manifest_location).read_text(encoding="utf-8")
    return json.loads(manifest_json)


@router.get("/{source_id}/artifacts")
async def list_artifacts(
    source_id: str,
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

    if not source.active_snapshot_id:
        return []

    art_res = await db.execute(
        select(GeneratedArtifact).where(
            GeneratedArtifact.snapshot_id == source.active_snapshot_id
        )
    )
    artifacts = art_res.scalars().all()
    return [
        {
            "id": a.id,
            "artifact_type": a.artifact_type,
            "checksum": a.checksum,
            "created_at": a.created_at.isoformat(),
        }
        for a in artifacts
    ]


@router.get("/{source_id}/artifacts/{artifact_type}")
async def get_artifact_content(
    source_id: str,
    artifact_type: str,
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
    if not source or not source.active_snapshot_id:
        raise HTTPException(status_code=404, detail="Source or active snapshot not found")

    art_res = await db.execute(
        select(GeneratedArtifact).where(
            and_(
                GeneratedArtifact.snapshot_id == source.active_snapshot_id,
                GeneratedArtifact.artifact_type == artifact_type,
            )
        )
    )
    artifact = art_res.scalar_one_or_none()
    if not artifact or not Path(artifact.storage_location).exists():
        raise HTTPException(status_code=404, detail=f"Artifact '{artifact_type}' not found")

    content = Path(artifact.storage_location).read_text(encoding="utf-8")
    media_type = "text/plain; charset=utf-8"
    if artifact_type.endswith("_txt") or artifact_type.endswith("_md"):
        media_type = "text/markdown; charset=utf-8"

    return Response(content=content, media_type=media_type)
