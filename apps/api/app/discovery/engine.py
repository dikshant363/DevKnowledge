from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.database.models import (
    DiscoveryCandidate,
    DiscoveryEvent,
    DiscoveryGlobalConfig,
    DocumentationSource,
    Organization,
    Technology,
)
from apps.api.app.discovery.catalog import TechnologyCatalogService
from apps.api.app.discovery.duplicate import DuplicateDetector
from apps.api.app.discovery.providers.base import DiscoveredCandidateDTO, DiscoveryProvider
from apps.api.app.discovery.providers.cross_reference import CrossReferenceProvider
from apps.api.app.discovery.providers.directories import OfficialDirectoryProvider
from apps.api.app.discovery.providers.github_api import GitHubDiscoveryProvider
from apps.api.app.discovery.providers.package_registries import PackageRegistryProvider
from apps.api.app.discovery.providers.search_engine import SearchEngineDiscoveryProvider
from apps.api.app.discovery.verification import OfficialSourceVerifier
from apps.api.app.jobs.service import JobQueueService

logger = structlog.get_logger()


class DiscoveryEngine:
    """
    Continuous Universal Documentation Discovery Orchestrator.
    Discovers, verifies, classifies, and automatically enqueues verified official documentation.
    """

    def __init__(self, providers: Optional[List[DiscoveryProvider]] = None):
        self.providers: List[DiscoveryProvider] = providers or [
            OfficialDirectoryProvider(),
            PackageRegistryProvider(),
            GitHubDiscoveryProvider(),
            SearchEngineDiscoveryProvider(),
            CrossReferenceProvider(),
        ]

    async def get_or_create_config(self, db: AsyncSession) -> DiscoveryGlobalConfig:
        res = await db.execute(select(DiscoveryGlobalConfig))
        cfg = res.scalar_one_or_none()
        if not cfg:
            cfg = DiscoveryGlobalConfig(
                is_discovery_paused=False,
                auto_registration_enabled=True,
                min_confidence_auto_register=0.85,
                excluded_technologies=[],
                rejected_domains=[],
            )
            db.add(cfg)
            await db.commit()
            await db.refresh(cfg)
        return cfg

    async def run_discovery_cycle(
        self,
        db: AsyncSession,
        queries: Optional[List[str]] = None,
        force: bool = False,
    ) -> Dict[str, Any]:
        """
        Executes one full discovery sweep across active providers.
        """
        config = await self.get_or_create_config(db)
        if config.is_discovery_paused and not force:
            logger.info("Universal discovery is currently paused via administrative toggle.")
            return {"status": "paused", "discovered_count": 0, "registered_count": 0}

        # Resolve target technologies to discover
        if not queries:
            tech_res = await db.execute(select(Technology.name).limit(20))
            queries = [t for t in tech_res.scalars().all() if t not in config.excluded_technologies]

        if not queries:
            # Seed catalog if empty
            await TechnologyCatalogService.seed_default_catalog(db)
            queries = ["fastapi", "tokio", "kubernetes", "swiftui", "pytorch"]

        # Ensure default organization exists for auto-registration
        org_res = await db.execute(select(Organization).limit(1))
        default_org = org_res.scalar_one_or_none()
        if not default_org:
            logger.warning("No default organization found for auto-registration.")
            return {"status": "missing_organization", "discovered_count": 0, "registered_count": 0}

        discovered_candidates: List[DiscoveredCandidateDTO] = []

        # 1. Query Providers with Quota Enforcement
        for q in queries:
            for provider in self.providers:
                has_quota = await provider.check_and_increment_quota(db, cost=1)
                if not has_quota:
                    continue
                try:
                    candidates = await provider.discover(q, limit=5)
                    discovered_candidates.extend(candidates)
                except Exception as e:
                    logger.warning(
                        "Provider discovery error",
                        provider=provider.provider_name,
                        query=q,
                        error=str(e),
                    )

        # 2. Group candidates to detect multi-provider cross-validation
        grouped: Dict[str, List[DiscoveredCandidateDTO]] = {}
        for c in discovered_candidates:
            domain = c.canonical_domain.lower()
            if domain not in grouped:
                grouped[domain] = []
            grouped[domain].append(c)

        total_registered = 0
        total_queued = 0

        # 3. Duplicate Suppression, Verification & Registration
        for domain, items in grouped.items():
            primary_candidate = items[0]
            co_providers = [it.provider_name for it in items]

            # Check duplicate against existing sources or candidates
            is_dup, dup_type, _ = await DuplicateDetector.check_duplicate(
                db, primary_candidate.candidate_url
            )
            if is_dup:
                logger.debug("Duplicate candidate suppressed", domain=domain, dup_type=dup_type)
                continue

            # Official Source Verification
            eval_result = OfficialSourceVerifier.evaluate(
                candidate=primary_candidate,
                co_providers=co_providers,
                rejected_domains=config.rejected_domains,
            )

            # Match or create Technology catalog entry
            tech = await TechnologyCatalogService.get_or_create_technology(
                db,
                name=primary_candidate.technology_name,
                category=primary_candidate.category,
                website_url=primary_candidate.candidate_url,
            )

            # Record Discovery Candidate
            cand_record = DiscoveryCandidate(
                technology_id=tech.id,
                candidate_url=primary_candidate.candidate_url,
                canonical_domain=domain,
                documentation_type=primary_candidate.documentation_type,
                category=primary_candidate.category,
                discovery_provider=primary_candidate.provider_name,
                confidence_score=eval_result["confidence_score"],
                classification=eval_result["classification"],
                verification_status=eval_result["verification_status"],
                evidence=eval_result["evidence"],
                license_info=primary_candidate.license_info,
                rejection_reason=eval_result.get("rejection_reason"),
            )
            db.add(cand_record)
            await db.flush()

            # Record event
            db.add(
                DiscoveryEvent(
                    event_type="discovered",
                    provider_name=primary_candidate.provider_name,
                    candidate_id=cand_record.id,
                    technology_name=tech.name,
                    details=eval_result,
                )
            )

            # 4. Automatic Registration & Pipeline Trigger
            if (
                eval_result["classification"] == "verified_official"
                and config.auto_registration_enabled
                and eval_result["confidence_score"] >= config.min_confidence_auto_register
            ):
                source = DocumentationSource(
                    organization_id=default_org.id,
                    name=tech.name,
                    root_url=primary_candidate.candidate_url,
                    canonical_domain=domain,
                    category=primary_candidate.category,
                    documentation_type=primary_candidate.documentation_type,
                    crawl_config={"max_depth": 5, "max_pages": 500},
                    sync_policy={"interval_hours": 24, "auto_publish": True},
                    status="pending",
                )
                db.add(source)
                await db.flush()

                cand_record.registered_source_id = source.id
                cand_record.verification_status = "auto_registered"
                cand_record.reviewed_at = datetime.now(timezone.utc)

                # Automatically enqueue durable crawl job into the pipeline!
                await JobQueueService.enqueue_job(
                    db=db,
                    source_id=source.id,
                    job_type="full_crawl",
                    priority=10,
                )

                db.add(
                    DiscoveryEvent(
                        event_type="auto_registered",
                        provider_name=primary_candidate.provider_name,
                        candidate_id=cand_record.id,
                        technology_name=tech.name,
                        details={"source_id": source.id, "root_url": source.root_url},
                    )
                )
                total_registered += 1
                logger.info(
                    "Auto-registered verified official documentation source",
                    source_name=source.name,
                    url=source.root_url,
                )
            else:
                total_queued += 1

        await db.commit()

        return {
            "status": "completed",
            "queries_executed": len(queries),
            "candidates_discovered": len(discovered_candidates),
            "sources_auto_registered": total_registered,
            "candidates_in_review_queue": total_queued,
        }
