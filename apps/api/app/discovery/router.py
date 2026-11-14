from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.auth.security import get_current_user_and_org
from apps.api.app.database.models import (
    DiscoveryCandidate,
    DiscoveryEvent,
    DiscoveryProviderConfig,
    DocumentationSource,
    Technology,
)
from apps.api.app.database.session import get_db
from apps.api.app.discovery.catalog import TechnologyCatalogService
from apps.api.app.discovery.engine import DiscoveryEngine
from apps.api.app.jobs.service import JobQueueService

router = APIRouter(prefix="/discovery", tags=["Universal Documentation Discovery"])


class CreateTechnologyRequest(BaseModel):
    name: str
    category: str = "library"
    ecosystem: str = "general"
    website_url: Optional[str] = None
    repository_url: Optional[str] = None
    description: Optional[str] = None
    parent_tech_id: Optional[str] = None
    relation_type: str = "framework"


class UpdateProviderConfigRequest(BaseModel):
    is_enabled: Optional[bool] = None
    quota_limit_daily: Optional[int] = None


class UpdateGlobalConfigRequest(BaseModel):
    is_discovery_paused: Optional[bool] = None
    auto_registration_enabled: Optional[bool] = None
    min_confidence_auto_register: Optional[float] = None
    excluded_technologies: Optional[List[str]] = None
    rejected_domains: Optional[List[str]] = None


class ReviewCandidateRequest(BaseModel):
    reason: Optional[str] = None


# 1. Technology Catalog Endpoints
@router.get("/technologies")
async def list_technologies(
    query: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    ecosystem: Optional[str] = Query(None),
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """
    Search and list technologies in the hierarchical technology catalog.
    """
    techs = await TechnologyCatalogService.search_technologies(
        db, query=query or "", category=category, ecosystem=ecosystem, limit=limit
    )
    return techs


@router.post("/technologies", status_code=status.HTTP_201_CREATED)
async def create_technology(
    req: CreateTechnologyRequest,
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    """
    Register a technology and connect it to a parent ecosystem in the hierarchy.
    """
    tech = await TechnologyCatalogService.get_or_create_technology(
        db,
        name=req.name,
        category=req.category,
        ecosystem=req.ecosystem,
        website_url=req.website_url,
        repository_url=req.repository_url,
        description=req.description,
    )
    if req.parent_tech_id:
        await TechnologyCatalogService.add_relationship(
            db,
            source_tech_id=req.parent_tech_id,
            target_tech_id=tech.id,
            relation_type=req.relation_type,
        )
    return tech


@router.get("/technologies/{tech_id}/tree")
async def get_technology_tree(
    tech_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve full multi-parent and child relationships for a technology.
    """
    tree = await TechnologyCatalogService.get_technology_tree(db, tech_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Technology not found")
    return tree


# 2. Candidate Discovery & Review Endpoints
@router.get("/candidates")
async def list_candidates(
    verification_status: Optional[str] = Query(None),
    classification: Optional[str] = Query(None),
    min_confidence: Optional[float] = Query(None),
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """
    List discovered candidates filtered by verification status, classification, or confidence.
    """
    stmt = select(DiscoveryCandidate)
    if verification_status:
        stmt = stmt.where(DiscoveryCandidate.verification_status == verification_status)
    if classification:
        stmt = stmt.where(DiscoveryCandidate.classification == classification)
    if min_confidence is not None:
        stmt = stmt.where(DiscoveryCandidate.confidence_score >= min_confidence)

    stmt = stmt.order_by(
        DiscoveryCandidate.confidence_score.desc(), DiscoveryCandidate.discovered_at.desc()
    ).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/candidates/{candidate_id}")
async def get_candidate_details(
    candidate_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve candidate documentation details and verification evidence signals.
    """
    res = await db.execute(select(DiscoveryCandidate).where(DiscoveryCandidate.id == candidate_id))
    cand = res.scalar_one_or_none()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return cand


@router.post("/candidates/{candidate_id}/approve")
async def approve_candidate(
    candidate_id: str,
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    """
    Manually approve a candidate from the review queue:
    registers documentation source and triggers automatic crawl.
    """
    _, org, _ = user_org
    res = await db.execute(select(DiscoveryCandidate).where(DiscoveryCandidate.id == candidate_id))
    cand = res.scalar_one_or_none()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    tech_name = cand.canonical_domain
    if cand.technology_id:
        t_res = await db.execute(select(Technology).where(Technology.id == cand.technology_id))
        t = t_res.scalar_one_or_none()
        if t:
            tech_name = t.name

    source = DocumentationSource(
        organization_id=org.id,
        name=tech_name,
        root_url=cand.candidate_url,
        canonical_domain=cand.canonical_domain,
        category=cand.category,
        documentation_type=cand.documentation_type,
        crawl_config={"max_depth": 5, "max_pages": 500},
        sync_policy={"interval_hours": 24, "auto_publish": True},
        status="pending",
    )
    db.add(source)
    await db.flush()

    cand.verification_status = "approved"
    cand.registered_source_id = source.id
    cand.reviewed_at = datetime.now(timezone.utc)

    # Enqueue crawl job in pipeline
    job = await JobQueueService.enqueue_job(
        db=db,
        source_id=source.id,
        job_type="full_crawl",
        priority=10,
    )

    db.add(
        DiscoveryEvent(
            event_type="auto_registered",
            provider_name=cand.discovery_provider,
            candidate_id=cand.id,
            technology_name=tech_name,
            details={"approved_by_user": True, "source_id": source.id, "job_id": job.id},
        )
    )
    await db.commit()
    return {"status": "approved", "source_id": source.id, "job_id": job.id}


@router.post("/candidates/{candidate_id}/reject")
async def reject_candidate(
    candidate_id: str,
    req: ReviewCandidateRequest,
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    """
    Reject a candidate with reason.
    """
    res = await db.execute(select(DiscoveryCandidate).where(DiscoveryCandidate.id == candidate_id))
    cand = res.scalar_one_or_none()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    cand.verification_status = "rejected"
    cand.classification = "rejected"
    cand.rejection_reason = req.reason or "Rejected by user review"
    cand.reviewed_at = datetime.now(timezone.utc)

    db.add(
        DiscoveryEvent(
            event_type="rejected",
            provider_name=cand.discovery_provider,
            candidate_id=cand.id,
            details={"rejection_reason": cand.rejection_reason},
        )
    )
    await db.commit()
    return {"status": "rejected", "rejection_reason": cand.rejection_reason}


# 3. Discovery Providers & Quota Management
@router.get("/providers")
async def list_providers(
    db: AsyncSession = Depends(get_db),
):
    """
    List configured discovery providers, health, and daily quota utilization.
    """
    res = await db.execute(
        select(DiscoveryProviderConfig).order_by(DiscoveryProviderConfig.priority.asc())
    )
    configs = res.scalars().all()
    return configs


@router.patch("/providers/{provider_name}")
async def update_provider_config(
    provider_name: str,
    req: UpdateProviderConfigRequest,
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    """
    Enable/disable discovery provider or adjust daily quota limits.
    """
    res = await db.execute(
        select(DiscoveryProviderConfig).where(
            DiscoveryProviderConfig.provider_name == provider_name
        )
    )
    config = res.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Provider configuration not found")

    if req.is_enabled is not None:
        config.is_enabled = req.is_enabled
    if req.quota_limit_daily is not None:
        config.quota_limit_daily = req.quota_limit_daily

    await db.commit()
    await db.refresh(config)
    return config


# 4. Trigger Discovery Engine
@router.post("/run")
async def run_discovery_sweep(
    queries: Optional[List[str]] = None,
    force: bool = False,
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    """
    Executes a discovery sweep across active providers and enqueues verified documentation.
    """
    engine = DiscoveryEngine()
    result = await engine.run_discovery_cycle(db, queries=queries, force=force)
    return result


# 5. History & Configuration
@router.get("/events")
async def list_discovery_events(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves discovery event audit log.
    """
    res = await db.execute(
        select(DiscoveryEvent).order_by(DiscoveryEvent.created_at.desc()).limit(limit)
    )
    return res.scalars().all()


@router.get("/config")
async def get_global_config(
    db: AsyncSession = Depends(get_db),
):
    """
    Get global discovery settings, pause status, and domain blacklists.
    """
    engine = DiscoveryEngine()
    return await engine.get_or_create_config(db)


@router.post("/config")
async def update_global_config(
    req: UpdateGlobalConfigRequest,
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    """
    Update global discovery pause toggle, minimum confidence, or domain blacklists.
    """
    engine = DiscoveryEngine()
    cfg = await engine.get_or_create_config(db)

    if req.is_discovery_paused is not None:
        cfg.is_discovery_paused = req.is_discovery_paused
    if req.auto_registration_enabled is not None:
        cfg.auto_registration_enabled = req.auto_registration_enabled
    if req.min_confidence_auto_register is not None:
        cfg.min_confidence_auto_register = req.min_confidence_auto_register
    if req.excluded_technologies is not None:
        cfg.excluded_technologies = req.excluded_technologies
    if req.rejected_domains is not None:
        cfg.rejected_domains = req.rejected_domains

    await db.commit()
    await db.refresh(cfg)
    return cfg
