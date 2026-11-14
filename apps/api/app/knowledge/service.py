import re
from typing import List, Tuple, Optional
from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from apps.api.app.database.models import (
    DocumentationSource,
    DocumentationPage,
    PageVersion,
    SourceSnapshot,
    KnowledgeChunk,
)
from apps.api.app.knowledge.schemas import (
    SearchQuery,
    SearchResultItem,
    SearchResponse,
    DocumentDetailResponse,
    SectionItem,
    CodeSnippetItem,
    APISymbolItem,
)


class SearchService:
    @staticmethod
    def extract_snippet(text: str, query: str, window: int = 120) -> str:
        if not text:
            return ""
        q_clean = query.strip().lower()
        idx = text.lower().find(q_clean)
        if idx == -1:
            words = q_clean.split()
            for w in words:
                idx = text.lower().find(w)
                if idx != -1:
                    break

        if idx == -1:
            return text[:window].replace("\n", " ").strip() + "..."

        start = max(0, idx - 40)
        end = min(len(text), idx + len(query) + window)
        snippet = text[start:end].replace("\n", " ").strip()
        prefix = "..." if start > 0 else ""
        suffix = "..." if end < len(text) else ""
        return f"{prefix}{snippet}{suffix}"

    @classmethod
    async def search(
        cls,
        db: AsyncSession,
        org_id: str,
        query: SearchQuery,
    ) -> SearchResponse:
        q_term = query.q.strip().lower()

        # Build tenant-scoped query joining pages with sources
        conditions = [
            DocumentationSource.organization_id == org_id,
            DocumentationPage.page_status == "indexed",
        ]

        if query.source_id:
            conditions.append(DocumentationSource.id == query.source_id)
        if query.category:
            conditions.append(DocumentationSource.category == query.category)

        # Keyword matching on title or path
        search_filter = or_(
            DocumentationPage.title.ilike(f"%{q_term}%"),
            DocumentationPage.normalized_path.ilike(f"%{q_term}%"),
        )
        conditions.append(search_filter)

        stmt = (
            select(DocumentationPage, DocumentationSource)
            .join(DocumentationSource, DocumentationPage.source_id == DocumentationSource.id)
            .where(and_(*conditions))
            .offset(query.offset)
            .limit(query.limit)
        )
        result = await db.execute(stmt)
        rows = result.all()

        results: List[SearchResultItem] = []
        for page, source in rows:
            # Score relevance
            score = 1.0
            if q_term in page.title.lower():
                score += 5.0
            if page.title.lower() == q_term:
                score += 10.0

            snippet = cls.extract_snippet(f"{page.title} - Documentation page at {page.canonical_url}", q_term)

            results.append(
                SearchResultItem(
                    document_id=page.id,
                    source_id=source.id,
                    source_name=source.name,
                    title=page.title,
                    canonical_url=page.canonical_url,
                    section_heading=None,
                    snippet=snippet,
                    score=score,
                    version=source.source_version,
                    snapshot_id=source.active_snapshot_id,
                )
            )

        # Sort by score descending
        results.sort(key=lambda x: x.score, reverse=True)

        return SearchResponse(
            results=results,
            total=len(results),
            query=query.q,
        )

    @classmethod
    async def get_document(
        cls,
        db: AsyncSession,
        org_id: str,
        document_id: str,
    ) -> DocumentDetailResponse:
        stmt = (
            select(DocumentationPage, DocumentationSource)
            .join(DocumentationSource, DocumentationPage.source_id == DocumentationSource.id)
            .where(
                and_(
                    DocumentationPage.id == document_id,
                    DocumentationSource.organization_id == org_id,
                )
            )
        )
        res = await db.execute(stmt)
        row = res.first()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")

        page, source = row

        # Fetch latest page version if present
        ver_stmt = (
            select(PageVersion)
            .where(PageVersion.page_id == page.id)
            .order_by(PageVersion.created_at.desc())
            .limit(1)
        )
        ver_res = await db.execute(ver_stmt)
        latest_ver = ver_res.scalar_one_or_none()

        sections = []
        code_snippets = []
        api_symbols = []

        if latest_ver and latest_ver.structured_content:
            data = latest_ver.structured_content
            for s in data.get("sections", []):
                sections.append(SectionItem(
                    id=s.get("id", "section"),
                    heading=s.get("heading", ""),
                    level=s.get("level", 1),
                    content=s.get("content", ""),
                ))
            for c in data.get("code_snippets", []):
                code_snippets.append(CodeSnippetItem(
                    language=c.get("language", "text"),
                    code=c.get("code", ""),
                    description=c.get("description"),
                ))
            for a in data.get("api_symbols", []):
                api_symbols.append(APISymbolItem(
                    name=a.get("name", ""),
                    signature=a.get("signature", ""),
                    description=a.get("description"),
                    is_deprecated=a.get("is_deprecated", False),
                ))

        if not sections:
            sections.append(SectionItem(id="overview", heading=page.title, level=1, content=f"Official docs for {page.title}"))

        return DocumentDetailResponse(
            id=page.id,
            source_id=source.id,
            source_name=source.name,
            canonical_url=page.canonical_url,
            normalized_path=page.normalized_path,
            title=page.title,
            sections=sections,
            code_snippets=code_snippets,
            api_symbols=api_symbols,
            content_hash=page.current_content_hash,
            version=source.source_version,
            last_updated=page.updated_at,
        )
