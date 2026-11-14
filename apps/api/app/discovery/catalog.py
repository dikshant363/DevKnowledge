import re
from typing import Any, Dict, List, Optional

import structlog
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.database.models import Technology, TechnologyRelation

logger = structlog.get_logger()


def slugify(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s


class TechnologyCatalogService:
    """
    Manages the dynamic, hierarchical technology catalog.
    Supports multi-parent graph relationships across developer ecosystems.
    """

    @classmethod
    async def get_or_create_technology(
        cls,
        db: AsyncSession,
        name: str,
        category: str = "library",
        ecosystem: str = "general",
        website_url: Optional[str] = None,
        repository_url: Optional[str] = None,
        description: Optional[str] = None,
        is_official: bool = True,
    ) -> Technology:
        slug = slugify(name)
        res = await db.execute(select(Technology).where(Technology.slug == slug))
        tech = res.scalar_one_or_none()
        if tech:
            return tech

        tech = Technology(
            name=name,
            slug=slug,
            category=category,
            ecosystem=ecosystem,
            website_url=website_url,
            repository_url=repository_url,
            description=description,
            is_official=is_official,
        )
        db.add(tech)
        await db.commit()
        await db.refresh(tech)
        logger.info("Added technology to catalog", name=name, slug=slug, category=category)
        return tech

    @classmethod
    async def add_relationship(
        cls,
        db: AsyncSession,
        source_tech_id: str,
        target_tech_id: str,
        relation_type: str = "framework",
    ) -> TechnologyRelation:
        res = await db.execute(
            select(TechnologyRelation).where(
                TechnologyRelation.source_tech_id == source_tech_id,
                TechnologyRelation.target_tech_id == target_tech_id,
                TechnologyRelation.relation_type == relation_type,
            )
        )
        existing = res.scalar_one_or_none()
        if existing:
            return existing

        relation = TechnologyRelation(
            source_tech_id=source_tech_id,
            target_tech_id=target_tech_id,
            relation_type=relation_type,
        )
        db.add(relation)
        await db.commit()
        await db.refresh(relation)
        return relation

    @classmethod
    async def get_technology_tree(cls, db: AsyncSession, tech_id: str) -> Dict[str, Any]:
        tech_res = await db.execute(select(Technology).where(Technology.id == tech_id))
        tech = tech_res.scalar_one_or_none()
        if not tech:
            return {}

        # Fetch child relationships where this technology is source
        child_rels_res = await db.execute(
            select(TechnologyRelation, Technology)
            .join(Technology, TechnologyRelation.target_tech_id == Technology.id)
            .where(TechnologyRelation.source_tech_id == tech_id)
        )
        children = []
        for rel, child_tech in child_rels_res.all():
            children.append(
                {
                    "id": child_tech.id,
                    "name": child_tech.name,
                    "slug": child_tech.slug,
                    "category": child_tech.category,
                    "relation_type": rel.relation_type,
                }
            )

        # Fetch parent relationships where this technology is target
        parent_rels_res = await db.execute(
            select(TechnologyRelation, Technology)
            .join(Technology, TechnologyRelation.source_tech_id == Technology.id)
            .where(TechnologyRelation.target_tech_id == tech_id)
        )
        parents = []
        for rel, parent_tech in parent_rels_res.all():
            parents.append(
                {
                    "id": parent_tech.id,
                    "name": parent_tech.name,
                    "slug": parent_tech.slug,
                    "category": parent_tech.category,
                    "relation_type": rel.relation_type,
                }
            )

        return {
            "id": tech.id,
            "name": tech.name,
            "slug": tech.slug,
            "category": tech.category,
            "ecosystem": tech.ecosystem,
            "description": tech.description,
            "website_url": tech.website_url,
            "repository_url": tech.repository_url,
            "parents": parents,
            "children": children,
        }

    @classmethod
    async def search_technologies(
        cls,
        db: AsyncSession,
        query: str,
        category: Optional[str] = None,
        ecosystem: Optional[str] = None,
        limit: int = 50,
    ) -> List[Technology]:
        filters = []
        if query:
            clean_q = f"%{query.lower()}%"
            filters.append(
                or_(
                    Technology.name.ilike(clean_q),
                    Technology.slug.ilike(clean_q),
                    Technology.description.ilike(clean_q),
                )
            )
        if category:
            filters.append(Technology.category == category)
        if ecosystem:
            filters.append(Technology.ecosystem == ecosystem)

        stmt = select(Technology)
        if filters:
            stmt = stmt.where(*filters)
        stmt = stmt.order_by(Technology.name.asc()).limit(limit)

        res = await db.execute(stmt)
        return list(res.scalars().all())

    @classmethod
    async def seed_default_catalog(cls, db: AsyncSession):
        """
        Seeds standard baseline hierarchies (Android, Apple, Python, Rust, Cloud).
        """
        seeds = [
            # Apple Ecosystem
            (
                "Apple",
                "platform",
                "apple",
                "https://developer.apple.com",
                None,
                "Apple Developer Platform",
            ),
            (
                "iOS",
                "operating_system",
                "apple",
                "https://developer.apple.com/ios/",
                None,
                "Apple iOS Operating System",
            ),
            (
                "Swift",
                "programming_language",
                "apple",
                "https://swift.org",
                "https://github.com/swiftlang/swift",
                "Swift Language",
            ),
            (
                "SwiftUI",
                "framework",
                "apple",
                "https://developer.apple.com/xcode/swiftui/",
                None,
                "SwiftUI Declarative UI Framework",
            ),
            # Android Ecosystem
            (
                "Android",
                "platform",
                "android",
                "https://developer.android.com",
                None,
                "Android Open Source Project",
            ),
            (
                "Kotlin",
                "programming_language",
                "jvm",
                "https://kotlinlang.org",
                "https://github.com/JetBrains/kotlin",
                "Kotlin Language",
            ),
            (
                "Jetpack Compose",
                "framework",
                "android",
                "https://developer.android.com/compose",
                None,
                "Modern toolkit for Android UI",
            ),
            (
                "Material 3",
                "design_system",
                "android",
                "https://m3.material.io",
                None,
                "Material Design 3 System",
            ),
            # Python Ecosystem
            (
                "Python",
                "programming_language",
                "python",
                "https://www.python.org",
                "https://github.com/python/cpython",
                "Python Language",
            ),
            (
                "FastAPI",
                "framework",
                "python",
                "https://fastapi.tiangolo.com",
                "https://github.com/fastapi/fastapi",
                "Modern high-performance web framework for Python",
            ),
            (
                "PyTorch",
                "ai_ml",
                "python",
                "https://pytorch.org",
                "https://github.com/pytorch/pytorch",
                "Deep learning framework",
            ),
            # Rust Ecosystem
            (
                "Rust",
                "programming_language",
                "rust",
                "https://www.rust-lang.org",
                "https://github.com/rust-lang/rust",
                "Empowering everyone to build reliable and efficient software",
            ),
            (
                "Tokio",
                "runtime",
                "rust",
                "https://tokio.rs",
                "https://github.com/tokio-rs/tokio",
                "An asynchronous runtime for the Rust programming language",
            ),
            (
                "Axum",
                "framework",
                "rust",
                "https://docs.rs/axum",
                "https://github.com/tokio-rs/axum",
                "Ergonomic and modular web framework built with Tokio",
            ),
        ]

        tech_map = {}
        for name, cat, eco, web, repo, desc in seeds:
            t = await cls.get_or_create_technology(
                db,
                name=name,
                category=cat,
                ecosystem=eco,
                website_url=web,
                repository_url=repo,
                description=desc,
            )
            tech_map[name] = t

        # Connect Hierarchies
        relations = [
            ("Apple", "iOS", "operating_system"),
            ("iOS", "Swift", "language"),
            ("Swift", "SwiftUI", "framework"),
            ("Android", "Kotlin", "language"),
            ("Kotlin", "Jetpack Compose", "framework"),
            ("Jetpack Compose", "Material 3", "design_system"),
            ("Python", "FastAPI", "framework"),
            ("Python", "PyTorch", "framework"),
            ("Rust", "Tokio", "runtime"),
            ("Tokio", "Axum", "framework"),
        ]

        for src_name, tgt_name, rel_type in relations:
            if src_name in tech_map and tgt_name in tech_map:
                await cls.add_relationship(
                    db, tech_map[src_name].id, tech_map[tgt_name].id, rel_type
                )
