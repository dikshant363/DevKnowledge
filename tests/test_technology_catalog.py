import pytest

from apps.api.app.database.models import Base
from apps.api.app.database.session import AsyncSessionLocal, engine
from apps.api.app.discovery.catalog import TechnologyCatalogService


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest.mark.asyncio
async def test_technology_catalog_hierarchy():
    async with AsyncSessionLocal() as db:
        # Create hierarchy: Apple -> iOS -> Swift -> SwiftUI
        apple = await TechnologyCatalogService.get_or_create_technology(
            db, name="Apple", category="platform", ecosystem="apple"
        )
        ios = await TechnologyCatalogService.get_or_create_technology(
            db, name="iOS", category="operating_system", ecosystem="apple"
        )
        swift = await TechnologyCatalogService.get_or_create_technology(
            db, name="Swift", category="programming_language", ecosystem="apple"
        )
        swiftui = await TechnologyCatalogService.get_or_create_technology(
            db, name="SwiftUI", category="framework", ecosystem="apple"
        )

        await TechnologyCatalogService.add_relationship(db, apple.id, ios.id, "subsystem")
        await TechnologyCatalogService.add_relationship(db, ios.id, swift.id, "language")
        await TechnologyCatalogService.add_relationship(db, swift.id, swiftui.id, "framework")

        # Query tree for Swift
        tree = await TechnologyCatalogService.get_technology_tree(db, swift.id)
        assert tree["name"] == "Swift"
        assert len(tree["parents"]) == 1
        assert tree["parents"][0]["name"] == "iOS"
        assert len(tree["children"]) == 1
        assert tree["children"][0]["name"] == "SwiftUI"


@pytest.mark.asyncio
async def test_search_and_seed_catalog():
    async with AsyncSessionLocal() as db:
        await TechnologyCatalogService.seed_default_catalog(db)

        # Search by query
        results = await TechnologyCatalogService.search_technologies(db, query="tokio")
        assert len(results) >= 1
        assert any(r.name == "Tokio" for r in results)

        # Search by ecosystem
        rust_techs = await TechnologyCatalogService.search_technologies(
            db, query="", ecosystem="rust"
        )
        assert len(rust_techs) >= 2  # Rust, Tokio, Axum
