import pytest
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from apps.api.app.database.models import (
    Base,
    User,
    Organization,
    OrganizationMember,
    DocumentationSource,
    DocumentationPage,
    SourceSnapshot,
    PageVersion,
    KnowledgeChunk,
    APISymbolModel,
    CodeExampleModel,
)


@pytest.fixture
async def async_session():
    # In-memory SQLite for isolated database testing
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_create_user_and_org(async_session: AsyncSession):
    user = User(
        email="test@devknowledge.local",
        password_hash="hashed_pw_123",
        display_name="Test Developer",
        account_status="active",
    )
    async_session.add(user)
    await async_session.flush()

    org = Organization(
        name="Acme Corp",
        slug="acme-corp",
        owner_user_id=user.id,
    )
    async_session.add(org)
    await async_session.flush()

    member = OrganizationMember(
        organization_id=org.id,
        user_id=user.id,
        role="owner",
    )
    async_session.add(member)
    await async_session.flush()

    assert user.id is not None
    assert org.id is not None
    assert member.role == "owner"


@pytest.mark.asyncio
async def test_documentation_source_and_pages(async_session: AsyncSession):
    user = User(email="author@devknowledge.local", password_hash="hash", display_name="Author")
    async_session.add(user)
    await async_session.flush()

    org = Organization(name="Docs Org", slug="docs-org", owner_user_id=user.id)
    async_session.add(org)
    await async_session.flush()

    source = DocumentationSource(
        organization_id=org.id,
        name="Rust Documentation",
        root_url="https://doc.rust-lang.org/",
        canonical_domain="doc.rust-lang.org",
        category="systems",
        documentation_type="official",
        crawl_config={"max_depth": 5},
        sync_policy={"interval_hours": 24},
        status="active",
    )
    async_session.add(source)
    await async_session.flush()

    page = DocumentationPage(
        source_id=source.id,
        canonical_url="https://doc.rust-lang.org/book/ch01.html",
        normalized_path="/book/ch01.html",
        title="Getting Started",
        current_content_hash="hash_ch01_v1",
    )
    async_session.add(page)
    await async_session.flush()

    snapshot = SourceSnapshot(
        source_id=source.id,
        version_number=1,
        snapshot_hash="snap_hash_1",
        page_count=1,
        status="published",
    )
    async_session.add(snapshot)
    await async_session.flush()

    page_ver = PageVersion(
        page_id=page.id,
        snapshot_id=snapshot.id,
        content_hash="hash_ch01_v1",
        extracted_content="# Getting Started\nWelcome to Rust.",
        structured_content={"sections": [{"heading": "Getting Started", "content": "Welcome to Rust."}]},
        source_metadata={"url": page.canonical_url},
    )
    async_session.add(page_ver)
    await async_session.flush()

    chunk = KnowledgeChunk(
        page_version_id=page_ver.id,
        section_path="/getting-started",
        content="Welcome to Rust.",
        content_hash="chunk_hash_1",
        token_count=10,
        chunk_type="section",
    )
    async_session.add(chunk)
    await async_session.flush()

    assert source.id is not None
    assert page.id is not None
    assert snapshot.id is not None
    assert page_ver.id is not None
    assert chunk.id is not None
