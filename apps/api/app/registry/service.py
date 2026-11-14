from urllib.parse import urlparse
from typing import Optional, List, Tuple
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from apps.api.app.database.models import DocumentationSource, CrawlJob, DocumentationPage
from apps.api.app.registry.schemas import SourceCreate, SourceUpdate
from apps.api.app.security.ssrf import SSRFValidator, SSRFSecurityException
from apps.api.app.config import get_settings

settings = get_settings()


def suggest_display_name_and_category(url: str) -> Tuple[str, str]:
    parsed = urlparse(url)
    domain = (parsed.hostname or "").lower()
    path = parsed.path.lower()

    # Category inference
    category = "general"
    if any(k in domain or k in path for k in ["android", "ios", "swift", "kotlin", "flutter"]):
        category = "mobile-development"
    elif any(k in domain or k in path for k in ["rust", "cargo", "cpp", "zig", "linux", "kernel", "golang"]):
        category = "systems-programming"
    elif any(k in domain or k in path for k in ["react", "vue", "nextjs", "angular", "tailwind", "typescript", "javascript"]):
        category = "frontend-development"
    elif any(k in domain or k in path for k in ["python", "django", "fastapi", "flask", "node", "express"]):
        category = "backend-development"
    elif any(k in domain or k in path for k in ["pytorch", "tensorflow", "huggingface", "llm", "openai", "anthropic"]):
        category = "ai-ml"
    elif any(k in domain or k in path for k in ["postgres", "mysql", "redis", "mongodb", "sqlite"]):
        category = "databases"

    # Display name inference
    parts = domain.replace("www.", "").replace("docs.", "").replace("doc.", "").split(".")
    main_name = parts[0].capitalize()
    if len(parts) > 1 and parts[1] not in ["com", "org", "io", "dev", "net", "ai"]:
        main_name += f" {parts[1].capitalize()}"

    return f"{main_name} Documentation", category


class SourceRegistryService:
    @staticmethod
    async def create_source(
        db: AsyncSession,
        org_id: str,
        data: SourceCreate,
    ) -> DocumentationSource:
        # 1. SSRF and URL validation
        try:
            canonical_url, _ = SSRFValidator.validate_url(
                data.root_url,
                allow_private=settings.ALLOW_PRIVATE_IPS,
            )
        except SSRFSecurityException as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid or prohibited documentation URL: {str(e)}",
            )

        parsed = urlparse(canonical_url)
        domain = parsed.hostname or ""

        # 2. Duplicate detection within the tenant
        existing = await db.execute(
            select(DocumentationSource).where(
                and_(
                    DocumentationSource.organization_id == org_id,
                    DocumentationSource.root_url == canonical_url,
                )
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Documentation source with URL '{canonical_url}' is already registered in this organization.",
            )

        # 3. Auto-suggest name and category if default
        suggested_name, suggested_category = suggest_display_name_and_category(canonical_url)
        name = data.name or suggested_name
        category = data.category if data.category != "general" else suggested_category

        source = DocumentationSource(
            organization_id=org_id,
            name=name,
            root_url=canonical_url,
            canonical_domain=domain,
            category=category,
            documentation_type=data.documentation_type,
            source_version=data.version,
            crawl_config=data.crawl_config.model_dump() if data.crawl_config else {},
            sync_policy=data.sync_policy.model_dump() if data.sync_policy else {},
            status="queued",
        )
        db.add(source)
        await db.flush()

        # 4. Schedule initial discovery crawl job
        job = CrawlJob(
            source_id=source.id,
            job_type="discovery",
            status="pending",
            priority=10,
        )
        db.add(job)
        await db.commit()
        await db.refresh(source)

        return source

    @staticmethod
    async def list_sources(
        db: AsyncSession,
        org_id: str,
        category: Optional[str] = None,
        query: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[DocumentationSource], int]:
        filters = [DocumentationSource.organization_id == org_id]
        if category:
            filters.append(DocumentationSource.category == category)
        if query:
            filters.append(DocumentationSource.name.ilike(f"%{query}%"))

        total_stmt = select(func.count(DocumentationSource.id)).where(and_(*filters))
        total_res = await db.execute(total_stmt)
        total = total_res.scalar() or 0

        stmt = (
            select(DocumentationSource)
            .where(and_(*filters))
            .order_by(DocumentationSource.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        items = list(result.scalars().all())

        return items, total

    @staticmethod
    async def get_source(
        db: AsyncSession,
        org_id: str,
        source_id: str,
    ) -> DocumentationSource:
        result = await db.execute(
            select(DocumentationSource).where(
                and_(
                    DocumentationSource.id == source_id,
                    DocumentationSource.organization_id == org_id,
                )
            )
        )
        source = result.scalar_one_or_none()
        if not source:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Documentation source '{source_id}' not found.",
            )
        return source

    @staticmethod
    async def update_source(
        db: AsyncSession,
        org_id: str,
        source_id: str,
        data: SourceUpdate,
    ) -> DocumentationSource:
        source = await SourceRegistryService.get_source(db, org_id, source_id)

        if data.name is not None:
            source.name = data.name
        if data.category is not None:
            source.category = data.category
        if data.documentation_type is not None:
            source.documentation_type = data.documentation_type
        if data.version is not None:
            source.source_version = data.version
        if data.crawl_config is not None:
            source.crawl_config = data.crawl_config.model_dump()
        if data.sync_policy is not None:
            source.sync_policy = data.sync_policy.model_dump()

        await db.commit()
        await db.refresh(source)
        return source

    @staticmethod
    async def delete_source(
        db: AsyncSession,
        org_id: str,
        source_id: str,
    ) -> None:
        source = await SourceRegistryService.get_source(db, org_id, source_id)
        await db.delete(source)
        await db.commit()
