import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from apps.api.app.database.session import Base

# Universal JSON type compatible with Postgres JSONB and SQLite JSON
JSON_TYPE = JSON().with_variant(JSONB, "postgresql")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    account_status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    memberships: Mapped[List["OrganizationMember"]] = relationship(
        "OrganizationMember", back_populates="user", cascade="all, delete-orphan"
    )


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    owner_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    members: Mapped[List["OrganizationMember"]] = relationship(
        "OrganizationMember", back_populates="organization", cascade="all, delete-orphan"
    )
    sources: Mapped[List["DocumentationSource"]] = relationship(
        "DocumentationSource", back_populates="organization", cascade="all, delete-orphan"
    )
    projects: Mapped[List["ProjectProfile"]] = relationship(
        "ProjectProfile", back_populates="organization", cascade="all, delete-orphan"
    )


class OrganizationMember(Base):
    __tablename__ = "organization_members"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(
        String(50), default="member", nullable=False
    )  # owner, admin, member, reader
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    organization: Mapped["Organization"] = relationship("Organization", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="memberships")

    __table_args__ = (UniqueConstraint("organization_id", "user_id", name="uq_org_member"),)


class DocumentationSource(Base):
    __tablename__ = "documentation_sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    root_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    canonical_domain: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="general", nullable=False)
    documentation_type: Mapped[str] = mapped_column(String(50), default="official", nullable=False)
    source_version: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    crawl_config: Mapped[Dict[str, Any]] = mapped_column(JSON_TYPE, default=dict, nullable=False)
    sync_policy: Mapped[Dict[str, Any]] = mapped_column(JSON_TYPE, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default="idle", nullable=False
    )  # idle, queued, crawling, active, error
    active_snapshot_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    last_checked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_successful_sync_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    organization: Mapped["Organization"] = relationship("Organization", back_populates="sources")
    pages: Mapped[List["DocumentationPage"]] = relationship(
        "DocumentationPage", back_populates="source", cascade="all, delete-orphan"
    )
    crawl_jobs: Mapped[List["CrawlJob"]] = relationship(
        "CrawlJob", back_populates="source", cascade="all, delete-orphan"
    )
    snapshots: Mapped[List["SourceSnapshot"]] = relationship(
        "SourceSnapshot", back_populates="source", cascade="all, delete-orphan"
    )


class DocumentationPage(Base):
    __tablename__ = "documentation_pages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documentation_sources.id", ondelete="CASCADE"), nullable=False
    )
    canonical_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    normalized_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    title: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), default="text/html", nullable=False)
    current_content_hash: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    current_version_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    page_status: Mapped[str] = mapped_column(String(50), default="indexed", nullable=False)
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    source: Mapped["DocumentationSource"] = relationship(
        "DocumentationSource", back_populates="pages"
    )
    versions: Mapped[List["PageVersion"]] = relationship(
        "PageVersion", back_populates="page", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("source_id", "canonical_url", name="uq_page_source_url"),
        Index("ix_pages_source_id", "source_id"),
        Index("ix_pages_canonical_url", "canonical_url"),
    )


class CrawlJob(Base):
    __tablename__ = "crawl_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documentation_sources.id", ondelete="CASCADE"), nullable=False
    )
    job_type: Mapped[str] = mapped_column(String(50), default="full_crawl", nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default="pending", nullable=False
    )  # pending, leased, running, completed, failed, cancelled, dead_letter
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    progress: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    pages_discovered: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pages_processed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pages_failed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    lease_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    heartbeat_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    error_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(128), unique=True, nullable=True)
    worker_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    source: Mapped["DocumentationSource"] = relationship(
        "DocumentationSource", back_populates="crawl_jobs"
    )

    __table_args__ = (
        Index("ix_crawl_jobs_status_sched", "status", "scheduled_at"),
        Index("ix_crawl_jobs_lease_exp", "lease_expires_at"),
        Index("ix_crawl_jobs_prio_sched", "priority", "scheduled_at"),
    )


class SourceSnapshot(Base):
    __tablename__ = "source_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documentation_sources.id", ondelete="CASCADE"), nullable=False
    )
    version_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    snapshot_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    manifest_location: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    status: Mapped[str] = mapped_column(
        String(50), default="published", nullable=False
    )  # building, published, quarantined, archived
    page_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    compiler_version: Mapped[str] = mapped_column(String(50), default="1.0.0", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    source: Mapped["DocumentationSource"] = relationship(
        "DocumentationSource", back_populates="snapshots"
    )
    page_versions: Mapped[List["PageVersion"]] = relationship(
        "PageVersion", back_populates="snapshot", cascade="all, delete-orphan"
    )
    artifacts: Mapped[List["GeneratedArtifact"]] = relationship(
        "GeneratedArtifact", back_populates="snapshot", cascade="all, delete-orphan"
    )


class PageVersion(Base):
    __tablename__ = "page_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    page_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documentation_pages.id", ondelete="CASCADE"), nullable=False
    )
    snapshot_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("source_snapshots.id", ondelete="CASCADE"), nullable=False
    )
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    extracted_content: Mapped[str] = mapped_column(Text, default="", nullable=False)
    structured_content: Mapped[Dict[str, Any]] = mapped_column(
        JSON_TYPE, default=dict, nullable=False
    )
    source_metadata: Mapped[Dict[str, Any]] = mapped_column(JSON_TYPE, default=dict, nullable=False)
    extraction_status: Mapped[str] = mapped_column(String(50), default="success", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    page: Mapped["DocumentationPage"] = relationship("DocumentationPage", back_populates="versions")
    snapshot: Mapped["SourceSnapshot"] = relationship(
        "SourceSnapshot", back_populates="page_versions"
    )
    chunks: Mapped[List["KnowledgeChunk"]] = relationship(
        "KnowledgeChunk", back_populates="page_version", cascade="all, delete-orphan"
    )
    symbols: Mapped[List["APISymbolModel"]] = relationship(
        "APISymbolModel", back_populates="page_version", cascade="all, delete-orphan"
    )
    examples: Mapped[List["CodeExampleModel"]] = relationship(
        "CodeExampleModel", back_populates="page_version", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("page_id", "content_hash", "snapshot_id", name="uq_page_version"),
    )


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    page_version_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("page_versions.id", ondelete="CASCADE"), nullable=False
    )
    section_path: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    chunk_type: Mapped[str] = mapped_column(String(50), default="section", nullable=False)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON_TYPE, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    page_version: Mapped["PageVersion"] = relationship("PageVersion", back_populates="chunks")


class APISymbolModel(Base):
    __tablename__ = "api_symbols"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    page_version_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("page_versions.id", ondelete="CASCADE"), nullable=False
    )
    symbol_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    symbol_type: Mapped[str] = mapped_column(String(50), nullable=False)
    signature: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    language: Mapped[str] = mapped_column(String(50), default="generic", nullable=False)
    version_metadata: Mapped[Dict[str, Any]] = mapped_column(
        JSON_TYPE, default=dict, nullable=False
    )
    deprecation_status: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON_TYPE, default=dict, nullable=False)

    page_version: Mapped["PageVersion"] = relationship("PageVersion", back_populates="symbols")


class CodeExampleModel(Base):
    __tablename__ = "code_examples"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    page_version_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("page_versions.id", ondelete="CASCADE"), nullable=False
    )
    language: Mapped[str] = mapped_column(String(50), default="text", nullable=False)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_location: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    validation_status: Mapped[str] = mapped_column(
        String(50), default="unvalidated", nullable=False
    )
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON_TYPE, default=dict, nullable=False)

    page_version: Mapped["PageVersion"] = relationship("PageVersion", back_populates="examples")


class KnowledgeRelationship(Base):
    __tablename__ = "knowledge_relationships"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    source_entity_id: Mapped[str] = mapped_column(String(36), nullable=False)
    target_entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    target_entity_id: Mapped[str] = mapped_column(String(36), nullable=False)
    relationship_type: Mapped[str] = mapped_column(String(50), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    provenance: Mapped[Dict[str, Any]] = mapped_column(JSON_TYPE, default=dict, nullable=False)


class SyncEvent(Base):
    __tablename__ = "sync_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documentation_sources.id", ondelete="CASCADE"), nullable=False
    )
    page_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("documentation_pages.id", ondelete="SET NULL"), nullable=True
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    previous_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    new_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    classification: Mapped[str] = mapped_column(
        String(50), default="content_update", nullable=False
    )
    status: Mapped[str] = mapped_column(String(50), default="processed", nullable=False)
    details: Mapped[Dict[str, Any]] = mapped_column(JSON_TYPE, default=dict, nullable=False)
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class GeneratedArtifact(Base):
    __tablename__ = "generated_artifacts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documentation_sources.id", ondelete="CASCADE"), nullable=False
    )
    snapshot_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("source_snapshots.id", ondelete="CASCADE"), nullable=False
    )
    artifact_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # llms_txt, llms_full_txt, agents_md, skill_md, markdown_zip
    artifact_version: Mapped[str] = mapped_column(String(50), default="1.0.0", nullable=False)
    storage_location: Mapped[str] = mapped_column(String(1024), nullable=False)
    checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    generation_status: Mapped[str] = mapped_column(String(50), default="ready", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    snapshot: Mapped["SourceSnapshot"] = relationship("SourceSnapshot", back_populates="artifacts")


class ProjectProfile(Base):
    __tablename__ = "project_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    configuration: Mapped[Dict[str, Any]] = mapped_column(JSON_TYPE, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    organization: Mapped["Organization"] = relationship("Organization", back_populates="projects")
    dependencies: Mapped[List["ProjectDependency"]] = relationship(
        "ProjectDependency", back_populates="project", cascade="all, delete-orphan"
    )


class ProjectDependency(Base):
    __tablename__ = "project_dependencies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_profile_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("project_profiles.id", ondelete="CASCADE"), nullable=False
    )
    ecosystem: Mapped[str] = mapped_column(String(50), nullable=False)
    package_name: Mapped[str] = mapped_column(String(255), nullable=False)
    version_constraint: Mapped[str] = mapped_column(String(100), nullable=False)
    resolved_version: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    documentation_source_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("documentation_sources.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    project: Mapped["ProjectProfile"] = relationship(
        "ProjectProfile", back_populates="dependencies"
    )


class AgentConnection(Base):
    __tablename__ = "agent_connections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    client_name: Mapped[str] = mapped_column(String(255), nullable=False)
    connection_type: Mapped[str] = mapped_column(
        String(50), default="mcp", nullable=False
    )  # mcp, cli, sdk
    credential_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    permissions: Mapped[Dict[str, Any]] = mapped_column(JSON_TYPE, default=dict, nullable=False)
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    actor_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON_TYPE, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
