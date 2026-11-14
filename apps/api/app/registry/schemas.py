from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, HttpUrl, ConfigDict


class CrawlConfig(BaseModel):
    max_pages: int = Field(default=1000, ge=1, le=50000)
    max_depth: int = Field(default=5, ge=1, le=20)
    javascript_rendering: Literal["auto", "always", "never"] = "auto"
    allowed_paths: List[str] = Field(default_factory=list)
    excluded_paths: List[str] = Field(default_factory=list)
    request_timeout: int = Field(default=15, ge=5, le=60)


class SyncPolicy(BaseModel):
    mode: Literal["automatic", "manual"] = "automatic"
    interval_hours: int = Field(default=24, ge=1, le=720)


class SourceCreate(BaseModel):
    root_url: str = Field(description="Root documentation URL to index")
    name: Optional[str] = Field(default=None, description="Display name. Suggested automatically if omitted.")
    category: str = Field(default="general", description="Technology category (e.g. mobile, systems, backend)")
    documentation_type: str = Field(default="official", description="Type of docs (official, community, api_reference)")
    version: Optional[str] = Field(default=None, description="Preferred documentation version string")
    crawl_config: Optional[CrawlConfig] = Field(default_factory=CrawlConfig)
    sync_policy: Optional[SyncPolicy] = Field(default_factory=SyncPolicy)


class SourceUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    documentation_type: Optional[str] = None
    version: Optional[str] = None
    crawl_config: Optional[CrawlConfig] = None
    sync_policy: Optional[SyncPolicy] = None


class SourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    name: str
    root_url: str
    canonical_domain: str
    category: str
    documentation_type: str
    source_version: Optional[str]
    crawl_config: Dict[str, Any]
    sync_policy: Dict[str, Any]
    status: str
    active_snapshot_id: Optional[str]
    last_checked_at: Optional[datetime]
    last_successful_sync_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class SourceListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: List[SourceResponse]
    total: int


class SourceStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    source_id: str
    status: str
    active_snapshot_id: Optional[str]
    pages_indexed: int
    last_checked_at: Optional[datetime]
    last_successful_sync_at: Optional[datetime]
    latest_job_id: Optional[str]
    job_progress: float
