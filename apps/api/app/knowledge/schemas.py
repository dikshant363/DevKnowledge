from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class SearchQuery(BaseModel):
    q: str = Field(min_length=1, description="Search query string")
    source_id: Optional[str] = Field(default=None, description="Optional source filter")
    category: Optional[str] = Field(default=None, description="Optional category filter")
    version: Optional[str] = Field(default=None, description="Preferred documentation version")
    limit: int = Field(default=10, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class SearchResultItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    document_id: str
    source_id: str
    source_name: str
    title: str
    canonical_url: str
    section_heading: Optional[str] = None
    snippet: str
    score: float
    version: Optional[str] = None
    snapshot_id: Optional[str] = None


class SearchResponse(BaseModel):
    results: List[SearchResultItem]
    total: int
    query: str


class SectionItem(BaseModel):
    id: str
    heading: str
    level: int
    content: str


class CodeSnippetItem(BaseModel):
    language: str
    code: str
    description: Optional[str] = None


class APISymbolItem(BaseModel):
    name: str
    signature: str
    description: Optional[str] = None
    is_deprecated: bool = False


class DocumentDetailResponse(BaseModel):
    id: str
    source_id: str
    source_name: str
    canonical_url: str
    normalized_path: str
    title: str
    sections: List[SectionItem]
    code_snippets: List[CodeSnippetItem]
    api_symbols: List[APISymbolItem]
    content_hash: str
    version: Optional[str] = None
    last_updated: datetime
