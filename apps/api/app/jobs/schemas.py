from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class EnqueueJobRequest(BaseModel):
    source_id: str
    job_type: str = "full_crawl"
    priority: int = 0
    idempotency_key: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    max_attempts: int = 3


class ClaimJobRequest(BaseModel):
    worker_id: str
    lease_seconds: int = 600


class HeartbeatRequest(BaseModel):
    worker_id: str
    extend_seconds: int = 600


class CompleteJobRequest(BaseModel):
    worker_id: str
    pages_processed: int = 0
    pages_failed: int = 0


class FailJobRequest(BaseModel):
    worker_id: str
    error_message: str
    error_details: Optional[str] = None


class CancelJobRequest(BaseModel):
    reason: str = "Cancelled by user"


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source_id: str
    job_type: str
    status: str
    priority: int
    progress: float
    pages_discovered: int
    pages_processed: int
    pages_failed: int
    attempt_count: int
    max_attempts: int
    scheduled_at: datetime
    lease_expires_at: Optional[datetime] = None
    heartbeat_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_summary: Optional[str] = None
    error_details: Optional[str] = None
    idempotency_key: Optional[str] = None
    worker_id: Optional[str] = None


class QueueStatsResponse(BaseModel):
    pending: int = 0
    leased: int = 0
    completed: int = 0
    failed: int = 0
    dead_letter: int = 0
    cancelled: int = 0
    total: int = 0
    active_leases: int = 0
    overdue_pending: int = 0
