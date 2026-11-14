import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock

import httpx
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from apps.api.app.config import get_settings
from apps.api.app.database.models import (
    Base,
    CrawlJob,
    DocumentationSource,
)
from apps.api.app.main import app
from apps.worker.crawler.engine import CrawlEngine
from apps.worker.sync.scheduler import SyncScheduler


@pytest.mark.asyncio
async def test_runner_api_key_authentication():
    """
    Verifies that the /api/v1/jobs/claim endpoint enforces runner key / user authentication.
    """
    settings = get_settings()
    original_env = settings.ENVIRONMENT
    settings.ENVIRONMENT = "production"

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Missing runner key and missing token -> 401 Unauthorized
            res_no_auth = await client.post(
                "/api/v1/jobs/claim",
                json={"worker_id": "rogue-worker", "lease_seconds": 60},
            )
            assert res_no_auth.status_code == 401
            assert "Authentication required" in res_no_auth.text

            # 2. Invalid runner key -> 401 Unauthorized
            res_bad_key = await client.post(
                "/api/v1/jobs/claim",
                headers={"X-Runner-Key": "invalid-secret-key"},
                json={"worker_id": "rogue-worker", "lease_seconds": 60},
            )
            assert res_bad_key.status_code == 401
            assert "Invalid runner API key" in res_bad_key.text

            # 3. Valid runner key -> 200 OK
            res_valid = await client.post(
                "/api/v1/jobs/claim",
                headers={"X-Runner-Key": settings.RUNNER_API_KEY},
                json={"worker_id": "valid-gha-worker", "lease_seconds": 60},
            )
            assert res_valid.status_code == 200

    finally:
        settings.ENVIRONMENT = original_env


@pytest.mark.asyncio
async def test_crawler_zero_pages_error_recovery():
    """
    Verifies that when a crawler fails to process any pages due to network/server errors,
    the job is marked 'failed', source marked 'error', and an exception is raised
    for durable queue retry.
    """
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        source = DocumentationSource(
            organization_id=f"org_{uuid.uuid4().hex[:6]}",
            name="Unreachable Docs",
            root_url="https://broken.docs.example.internal/index",
            canonical_domain="broken.docs.example.internal",
            category="backend-development",
            crawl_config={"max_pages": 5, "max_depth": 2},
        )
        session.add(source)
        await session.flush()

        job = CrawlJob(
            source_id=source.id,
            job_type="discovery",
            status="pending",
        )
        session.add(job)
        await session.commit()

        # Mock client to fail with network error on every request
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=httpx.ConnectError("Connection refused by peer"))

        crawler = CrawlEngine(client=mock_client)
        crawler.discovery.discover_sitemap = AsyncMock(return_value=[])

        # Expect RuntimeError on zero-page crawl failure
        with pytest.raises(RuntimeError) as exc_info:
            await crawler.crawl_source(session, source, job)

        assert "0 pages processed" in str(exc_info.value)
        assert job.status == "failed"
        assert source.status == "error"
        assert job.pages_processed == 0
        assert job.pages_failed > 0

    await engine.dispose()


@pytest.mark.asyncio
async def test_sync_scheduler_idempotency_and_queue():
    """
    Verifies that the sync scheduler enqueues jobs via JobQueueService with idempotency.
    """
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        source = DocumentationSource(
            organization_id=f"org_{uuid.uuid4().hex[:6]}",
            name="Scheduled Sync Docs",
            root_url="https://sync.example.com",
            canonical_domain="sync.example.com",
            category="backend-development",
            status="active",
            sync_policy={"mode": "automatic", "interval_hours": 1},
            last_checked_at=datetime(2020, 1, 1, tzinfo=timezone.utc),
        )
        session.add(source)
        await session.commit()

        # Run scheduler
        count = await SyncScheduler.schedule_due_sources(session)
        assert count == 1
        assert source.status == "queued"

        # Re-running immediately should not duplicate due to status and idempotency
        count_repeat = await SyncScheduler.schedule_due_sources(session)
        assert count_repeat == 0

    await engine.dispose()
