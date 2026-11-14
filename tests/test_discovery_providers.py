import pytest
from sqlalchemy import delete

from apps.api.app.database.models import Base, DiscoveryProviderConfig
from apps.api.app.database.session import AsyncSessionLocal, engine
from apps.api.app.discovery.providers.directories import OfficialDirectoryProvider
from apps.api.app.discovery.providers.search_engine import SearchEngineDiscoveryProvider


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        await db.execute(delete(DiscoveryProviderConfig))
        await db.commit()
    yield


@pytest.mark.asyncio
async def test_official_directory_provider():
    provider = OfficialDirectoryProvider()

    # Query Kubernetes from CNCF directory
    candidates = await provider.discover("kubernetes")
    assert len(candidates) >= 1
    k8s = candidates[0]
    assert "kubernetes.io" in k8s.candidate_url
    assert k8s.confidence_score >= 0.95
    assert k8s.evidence["foundation"] == "CNCF"
    assert k8s.evidence["foundation_vetted"] is True


@pytest.mark.asyncio
async def test_provider_quota_enforcement():
    async with AsyncSessionLocal() as db:
        provider = SearchEngineDiscoveryProvider()
        provider.default_quota_limit = 2  # Set low quota for testing

        # First request consumes 1 quota
        ok1 = await provider.check_and_increment_quota(db, cost=1)
        assert ok1 is True

        # Second request consumes 1 quota (reaching limit of 2)
        ok2 = await provider.check_and_increment_quota(db, cost=1)
        assert ok2 is True

        # Third request exceeds limit -> must reject
        ok3 = await provider.check_and_increment_quota(db, cost=1)
        assert ok3 is False
