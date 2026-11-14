import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import delete, select

from apps.api.app.database.models import (
    Base,
    CrawlJob,
    DocumentationSource,
    Organization,
    User,
)
from apps.api.app.database.session import AsyncSessionLocal, engine
from apps.api.app.jobs.service import JobQueueService


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        await db.execute(delete(CrawlJob))
        await db.commit()
    yield


async def create_test_user_and_org(db):
    user = User(
        email=f"user_{uuid.uuid4().hex[:6]}@example.dev",
        password_hash="mock_hash",
        display_name="Job Tester",
        account_status="active",
    )
    db.add(user)
    await db.flush()

    org = Organization(
        name="Durable Test Org",
        slug=f"durable-{uuid.uuid4().hex[:6]}",
        owner_user_id=user.id,
    )
    db.add(org)
    await db.flush()
    return user, org


@pytest.mark.asyncio
async def test_enqueue_job_and_idempotency():
    async with AsyncSessionLocal() as db:
        _, org = await create_test_user_and_org(db)

        source = DocumentationSource(
            organization_id=org.id,
            name="Test Source",
            root_url="https://docs.example.com",
            canonical_domain="docs.example.com",
            category="general",
            documentation_type="library",
        )
        db.add(source)
        await db.commit()

        # Enqueue with idempotency key
        idem_key = f"sync-job-{uuid.uuid4().hex}"
        job1 = await JobQueueService.enqueue_job(
            db,
            source_id=source.id,
            job_type="full_crawl",
            priority=10,
            idempotency_key=idem_key,
            max_attempts=3,
        )
        assert job1.id is not None
        assert job1.status == "pending"
        assert job1.priority == 10
        assert job1.attempt_count == 0

        # Enqueue with same idempotency key -> must return identical job without duplicate insert
        job2 = await JobQueueService.enqueue_job(
            db,
            source_id=source.id,
            idempotency_key=idem_key,
        )
        assert job2.id == job1.id


@pytest.mark.asyncio
async def test_atomic_claim_heartbeat_and_complete():
    async with AsyncSessionLocal() as db:
        _, org = await create_test_user_and_org(db)

        source = DocumentationSource(
            organization_id=org.id,
            name="FastAPI Docs",
            root_url="https://fastapi.tiangolo.com",
            canonical_domain="fastapi.tiangolo.com",
            category="framework",
            documentation_type="api",
        )
        db.add(source)
        await db.commit()

        job = await JobQueueService.enqueue_job(db, source_id=source.id, priority=5)

        # Claim job
        worker_id = "gha-runner-node-1"
        claimed = await JobQueueService.claim_next_job(db, worker_id=worker_id, lease_seconds=300)
        assert claimed is not None
        assert claimed.id == job.id
        assert claimed.status == "leased"
        assert claimed.worker_id == worker_id
        assert claimed.attempt_count == 1
        assert claimed.lease_expires_at is not None

        # Heartbeat
        old_expiry = claimed.lease_expires_at
        if old_expiry.tzinfo is None:
            old_expiry = old_expiry.replace(tzinfo=timezone.utc)
        hb_ok = await JobQueueService.record_heartbeat(
            db, job_id=job.id, worker_id=worker_id, extend_seconds=600
        )
        assert hb_ok is True

        res = await db.execute(select(CrawlJob).where(CrawlJob.id == job.id))
        refreshed = res.scalar_one()
        ref_expiry = refreshed.lease_expires_at
        if ref_expiry.tzinfo is None:
            ref_expiry = ref_expiry.replace(tzinfo=timezone.utc)
        assert ref_expiry > old_expiry

        # Complete
        completed = await JobQueueService.complete_job(
            db, job_id=job.id, worker_id=worker_id, pages_processed=42
        )
        assert completed.status == "completed"
        assert completed.pages_processed == 42
        assert completed.progress == 1.0
        assert completed.lease_expires_at is None


@pytest.mark.asyncio
async def test_exponential_backoff_and_dead_letter():
    async with AsyncSessionLocal() as db:
        _, org = await create_test_user_and_org(db)

        source = DocumentationSource(
            organization_id=org.id,
            name="Failing Docs",
            root_url="https://failing.example.com",
            canonical_domain="failing.example.com",
            category="framework",
            documentation_type="api",
        )
        db.add(source)
        await db.commit()

        # Enqueue with max_attempts = 2
        job = await JobQueueService.enqueue_job(db, source_id=source.id, max_attempts=2)

        # Attempt 1: Claim and Fail
        claimed1 = await JobQueueService.claim_next_job(db, worker_id="worker-1")
        assert claimed1.attempt_count == 1

        failed1 = await JobQueueService.fail_job(
            db, job_id=job.id, worker_id="worker-1", error_message="HTTP 500"
        )
        assert failed1.status == "pending"  # Backoff retry
        sched = failed1.scheduled_at
        if sched.tzinfo is None:
            sched = sched.replace(tzinfo=timezone.utc)
        assert sched > datetime.now(timezone.utc)

        # Force schedule to now so it can be claimed again
        failed1.scheduled_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        await db.commit()

        # Attempt 2: Claim and Fail
        claimed2 = await JobQueueService.claim_next_job(db, worker_id="worker-2")
        assert claimed2.attempt_count == 2

        failed2 = await JobQueueService.fail_job(
            db, job_id=job.id, worker_id="worker-2", error_message="HTTP 500 again"
        )
        assert failed2.status == "dead_letter"  # Routed to dead-letter queue
        assert failed2.completed_at is not None


@pytest.mark.asyncio
async def test_abandoned_job_recovery():
    async with AsyncSessionLocal() as db:
        _, org = await create_test_user_and_org(db)

        source = DocumentationSource(
            organization_id=org.id,
            name="Stalled Source",
            root_url="https://stalled.example.com",
            canonical_domain="stalled.example.com",
            category="general",
            documentation_type="library",
        )
        db.add(source)
        await db.commit()

        job = await JobQueueService.enqueue_job(db, source_id=source.id, max_attempts=3)

        # Claim and artificially expire lease
        claimed = await JobQueueService.claim_next_job(
            db, worker_id="crashed-worker", lease_seconds=10
        )
        claimed.lease_expires_at = datetime.now(timezone.utc) - timedelta(seconds=60)
        await db.commit()

        # Claim next job by another worker -> must automatically claim the expired-lease job!
        new_worker = "healthy-worker"
        reclaimed = await JobQueueService.claim_next_job(
            db, worker_id=new_worker, lease_seconds=300
        )
        assert reclaimed is not None
        assert reclaimed.id == job.id
        assert reclaimed.worker_id == new_worker
        assert reclaimed.attempt_count == 2
