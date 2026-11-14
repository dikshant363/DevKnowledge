from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.app.auth.security import get_current_user_and_org
from apps.api.app.database.session import get_db
from apps.api.app.knowledge.schemas import (
    SearchQuery,
    SearchResponse,
    DocumentDetailResponse,
)
from apps.api.app.knowledge.service import SearchService

router = APIRouter(tags=["Knowledge Retrieval & Search"])


@router.get("/api/v1/search", response_model=SearchResponse)
async def search_docs_get(
    q: str = Query(..., min_length=1, description="Search term"),
    source_id: Optional[str] = Query(None, description="Optional source filter"),
    category: Optional[str] = Query(None, description="Optional category filter"),
    version: Optional[str] = Query(None, description="Optional version filter"),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    _, org, _ = user_org
    query = SearchQuery(
        q=q,
        source_id=source_id,
        category=category,
        version=version,
        limit=limit,
        offset=offset,
    )
    return await SearchService.search(db, org.id, query)


@router.post("/api/v1/search", response_model=SearchResponse)
async def search_docs_post(
    query: SearchQuery,
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    _, org, _ = user_org
    return await SearchService.search(db, org.id, query)


@router.get("/api/v1/documents/{document_id}", response_model=DocumentDetailResponse)
async def get_document(
    document_id: str,
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    _, org, _ = user_org
    return await SearchService.get_document(db, org.id, document_id)
