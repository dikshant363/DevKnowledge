import hmac
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.auth.security import decode_access_token, security_bearer
from apps.api.app.config import get_settings
from apps.api.app.database.models import CrawlJob, User
from apps.api.app.database.session import get_db
from apps.api.app.jobs.schemas import (
    CancelJobRequest,
    ClaimJobRequest,
    CompleteJobRequest,
    EnqueueJobRequest,
    FailJobRequest,
    HeartbeatRequest,
    JobResponse,
    QueueStatsResponse,
)
from apps.api.app.jobs.service import JobQueueService
from apps.api.app.quota.tracker import QuotaLimitExceededError

router = APIRouter(prefix="/jobs", tags=["Durable Job Queue"])


async def authenticate_runner_or_user(
    x_runner_key: Optional[str] = Header(None, alias="X-Runner-Key"),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
    db: AsyncSession = Depends(get_db),
):
    """
    Accepts either an authorized runner API key or a valid user JWT session.
    Fails closed with 401 Unauthorized if neither is verified.
    """
    settings = get_settings()

    # 1. Verify X-Runner-Key (constant-time comparison)
    if x_runner_key:
        if settings.RUNNER_API_KEY and hmac.compare_digest(x_runner_key, settings.RUNNER_API_KEY):
            return {"type": "runner", "id": "github-actions-runner"}
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid runner API key",
        )

    # 2. Verify User JWT Bearer Token
    if credentials:
        payload = decode_access_token(credentials.credentials)
        if payload and "sub" in payload:
            user_res = await db.execute(select(User).where(User.id == payload["sub"]))
            user = user_res.scalar_one_or_none()
            if user:
                return {"type": "user", "id": user.id}
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        )

    # 3. Testing Environment Direct Fallback
    if settings.ENVIRONMENT == "testing":
        return {"type": "test_direct", "id": "test-runner"}

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Provide X-Runner-Key or Bearer token.",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.post("/enqueue", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def enqueue_job(
    req: EnqueueJobRequest,
    auth=Depends(authenticate_runner_or_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Enqueue a new durable crawl job with idempotency and quota safeguards.
    """
    try:
        job = await JobQueueService.enqueue_job(
            db=db,
            source_id=req.source_id,
            job_type=req.job_type,
            priority=req.priority,
            idempotency_key=req.idempotency_key,
            scheduled_at=req.scheduled_at,
            max_attempts=req.max_attempts,
        )
        return job
    except QuotaLimitExceededError as e:
        raise HTTPException(status_code=429, detail=str(e)) from e


@router.post("/claim", response_model=Optional[JobResponse])
async def claim_job(
    req: ClaimJobRequest,
    auth=Depends(authenticate_runner_or_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Atomically claims the next pending or expired-lease job for a worker.
    """
    job = await JobQueueService.claim_next_job(
        db=db,
        worker_id=req.worker_id,
        lease_seconds=req.lease_seconds,
    )
    return job


@router.post("/{job_id}/heartbeat")
async def record_heartbeat(
    job_id: str,
    req: HeartbeatRequest,
    auth=Depends(authenticate_runner_or_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Extends the lease expiration for an active job.
    """
    ok = await JobQueueService.record_heartbeat(
        db=db,
        job_id=job_id,
        worker_id=req.worker_id,
        extend_seconds=req.extend_seconds,
    )
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid job or worker mismatch")
    return {"status": "ok", "heartbeat_recorded": True}


@router.post("/{job_id}/complete", response_model=JobResponse)
async def complete_job(
    job_id: str,
    req: CompleteJobRequest,
    auth=Depends(authenticate_runner_or_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Marks a claimed job as completed.
    """
    job = await JobQueueService.complete_job(
        db=db,
        job_id=job_id,
        worker_id=req.worker_id,
        pages_processed=req.pages_processed,
        pages_failed=req.pages_failed,
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/fail", response_model=JobResponse)
async def fail_job(
    job_id: str,
    req: FailJobRequest,
    auth=Depends(authenticate_runner_or_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Fails a job, scheduling exponential backoff retry or moving to dead_letter.
    """
    job = await JobQueueService.fail_job(
        db=db,
        job_id=job_id,
        worker_id=req.worker_id,
        error_message=req.error_message,
        error_details=req.error_details,
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/cancel", response_model=JobResponse)
async def cancel_job(
    job_id: str,
    req: CancelJobRequest,
    auth=Depends(authenticate_runner_or_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Cancels a pending or active job.
    """
    job = await JobQueueService.cancel_job(db=db, job_id=job_id, reason=req.reason)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/recover")
async def recover_abandoned_jobs(
    auth=Depends(authenticate_runner_or_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Explicitly scans for and recovers abandoned or expired-lease jobs.
    """
    recovered = await JobQueueService.recover_abandoned_jobs(db)
    return {"status": "ok", "recovered_jobs": recovered}


@router.get("/stats", response_model=QueueStatsResponse)
async def get_queue_stats(
    db: AsyncSession = Depends(get_db),
):
    """
    Returns metrics on queue depth, active leases, and overdue jobs.
    """
    stats = await JobQueueService.get_queue_stats(db)
    return stats


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves job details by ID.
    """
    res = await db.execute(select(CrawlJob).where(CrawlJob.id == job_id))
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
