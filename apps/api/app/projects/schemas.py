from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None)
    configuration: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    configuration: Optional[Dict[str, Any]] = None


class DependencyItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    ecosystem: str
    package_name: str
    version_constraint: str
    resolved_version: Optional[str] = None
    documentation_source_id: Optional[str] = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    name: str
    description: Optional[str]
    configuration: Dict[str, Any]
    created_at: datetime
    updated_at: datetime


class DependencyImportRequest(BaseModel):
    filename: str = Field(description="Name of manifest e.g. package.json, Cargo.toml")
    content: str = Field(description="Raw text content of manifest")


class VersionWarning(BaseModel):
    package_name: str
    declared_version: str
    source_name: Optional[str] = None
    available_version: Optional[str] = None
    warning_type: str  # version_mismatch, missing_documentation, deprecated_version
    message: str


class ProjectKnowledgeResponse(BaseModel):
    project_id: str
    project_name: str
    dependencies: List[DependencyItem]
    attached_sources: List[Dict[str, Any]]
    version_warnings: List[VersionWarning]
