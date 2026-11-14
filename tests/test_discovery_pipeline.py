import uuid

import pytest
from sqlalchemy import delete, select

from apps.api.app.compiler.pipeline import CompilerPipeline
from apps.api.app.database.models import (
    Base,
    CrawlJob,
    DiscoveryCandidate,
    DiscoveryEvent,
    DocumentationSource,
    Organization,
    User,
)
from apps.api.app.database.session import AsyncSessionLocal, engine
from apps.api.app.discovery.engine import DiscoveryEngine
from apps.api.app.discovery.providers.base import DiscoveredCandidateDTO, DiscoveryProvider


class MockAuthoritativeProvider(DiscoveryProvider):
    provider_name = "mock_authoritative"
    display_name = "Mock Authoritative Registry"

    async def discover(self, query: str, limit: int = 10):
        return [
            DiscoveredCandidateDTO(
                candidate_url="https://tokio.rs/docs/",
                technology_name="Tokio",
                category="library",
                documentation_type="official_manual",
                provider_name=self.provider_name,
                confidence_score=0.95,
                license_info="MIT",
                evidence={"official_manifest": True, "stars": 24000, "trusted_domain": True},
            )
        ]


class MockGitHubProvider(DiscoveryProvider):
    provider_name = "mock_github"
    display_name = "Mock GitHub Provider"

    async def discover(self, query: str, limit: int = 10):
        return [
            DiscoveredCandidateDTO(
                candidate_url="https://tokio.rs/docs/",
                technology_name="Tokio",
                category="library",
                documentation_type="official_manual",
                provider_name=self.provider_name,
                confidence_score=0.90,
                evidence={"github_repo": "tokio-rs/tokio", "stars": 24000},
            )
        ]


class MockUncertainProvider(DiscoveryProvider):
    provider_name = "mock_uncertain"
    display_name = "Mock Community Provider"

    async def discover(self, query: str, limit: int = 10):
        return [
            DiscoveredCandidateDTO(
                candidate_url="https://unofficial-tokio-blog.com/notes",
                technology_name="Tokio Notes",
                category="library",
                documentation_type="tutorial",
                provider_name=self.provider_name,
                confidence_score=0.45,
                evidence={"is_community": True},
            )
        ]


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        await db.execute(delete(DiscoveryEvent))
        await db.execute(delete(DiscoveryCandidate))
        await db.execute(delete(DocumentationSource))
        await db.commit()
    yield


@pytest.mark.asyncio
async def test_end_to_end_discovery_verification_and_pipeline():
    async with AsyncSessionLocal() as db:
        # Create default organization & user
        user = User(
            email=f"disc_user_{uuid.uuid4().hex[:6]}@example.dev",
            password_hash="mock_pw",
            display_name="Discovery Lead",
            account_status="active",
        )
        db.add(user)
        await db.flush()

        org = Organization(
            name="Discovery Org",
            slug=f"disc-org-{uuid.uuid4().hex[:6]}",
            owner_user_id=user.id,
        )
        db.add(org)
        await db.commit()

        # Engine with 3 mock providers
        engine_instance = DiscoveryEngine(
            providers=[
                MockAuthoritativeProvider(),
                MockGitHubProvider(),
                MockUncertainProvider(),
            ]
        )

        # 1. Run Discovery Sweep
        summary = await engine_instance.run_discovery_cycle(db, queries=["tokio"], force=True)
        assert summary["status"] == "completed"
        assert summary["sources_auto_registered"] >= 1
        assert summary["candidates_in_review_queue"] >= 1

        # 2. Verify Verified Source was registered in DocumentationSource
        src_res = await db.execute(
            select(DocumentationSource).where(DocumentationSource.canonical_domain == "tokio.rs")
        )
        source = src_res.scalar_one_or_none()
        assert source is not None
        assert source.name == "Tokio"
        assert source.root_url == "https://tokio.rs/docs/"

        # 3. Verify CrawlJob was automatically enqueued in durable job queue
        job_res = await db.execute(select(CrawlJob).where(CrawlJob.source_id == source.id))
        job = job_res.scalar_one_or_none()
        assert job is not None
        assert job.status == "pending"
        assert job.priority == 10

        # 4. Verify Uncertain candidate is in review queue (NOT auto-registered)
        cand_res = await db.execute(
            select(DiscoveryCandidate).where(
                DiscoveryCandidate.canonical_domain == "unofficial-tokio-blog.com"
            )
        )
        uncertain_cand = cand_res.scalar_one_or_none()
        assert uncertain_cand is not None
        assert uncertain_cand.verification_status == "pending_review"
        assert uncertain_cand.classification != "verified_official"
        assert uncertain_cand.registered_source_id is None

        # 5. Verify Discovery Events Audit Trail
        events_res = await db.execute(select(DiscoveryEvent))
        events = events_res.scalars().all()
        assert len(events) >= 2
        event_types = [e.event_type for e in events]
        assert "discovered" in event_types
        assert "auto_registered" in event_types

        # 6. Execute Pipeline to generate CKR Knowledge Artifacts
        snapshot = await CompilerPipeline.compile_source_snapshot(db, source)
        assert snapshot is not None
        assert snapshot.snapshot_hash is not None
        assert snapshot.manifest_location is not None
