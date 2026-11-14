import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.app.compiler.ckr import CKRDocument
from apps.api.app.compiler.targets import (
    AgentsMdCompiler,
    LLMsTxtCompiler,
    MarkdownCompiler,
    SkillMdCompiler,
)
from apps.api.app.database.models import (
    DocumentationPage,
    DocumentationSource,
    Organization,
    OrganizationMember,
    User,
)
from apps.api.app.database.session import AsyncSessionLocal, Base, engine
from apps.api.app.main import app


def test_ckr_model_and_reproducible_hash():
    doc1 = CKRDocument.from_page_and_extracted(
        document_id="doc-1",
        source_id="src-1",
        canonical_url="https://doc.rust-lang.org/book/ch01.html",
        normalized_path="/book/ch01.html",
        title="Getting Started",
        sections_data=[
            {
                "id": "install",
                "heading": "Installation",
                "level": 2,
                "content": "Install rustup.",
                "content_hash": "h1",
            }
        ],
        code_snippets_data=[
            {"language": "bash", "code": "curl --proto '=https' ...", "line_count": 1}
        ],
        api_symbols_data=[
            {"name": "println!", "signature": "macro println!()", "is_deprecated": False}
        ],
    )

    doc2 = CKRDocument.from_page_and_extracted(
        document_id="doc-1",
        source_id="src-1",
        canonical_url="https://doc.rust-lang.org/book/ch01.html",
        normalized_path="/book/ch01.html",
        title="Getting Started",
        sections_data=[
            {
                "id": "install",
                "heading": "Installation",
                "level": 2,
                "content": "Install rustup.",
                "content_hash": "h1",
            }
        ],
        code_snippets_data=[
            {"language": "bash", "code": "curl --proto '=https' ...", "line_count": 1}
        ],
        api_symbols_data=[
            {"name": "println!", "signature": "macro println!()", "is_deprecated": False}
        ],
    )

    assert doc1.content_hash == doc2.content_hash


def test_markdown_and_agent_compilers():
    doc = CKRDocument.from_page_and_extracted(
        document_id="doc-2",
        source_id="src-2",
        canonical_url="https://react.dev/reference/react",
        normalized_path="/reference/react",
        title="React APIs",
        sections_data=[
            {
                "id": "hooks",
                "heading": "Hooks",
                "level": 2,
                "content": "Built-in React Hooks.",
                "content_hash": "h2",
            }
        ],
        code_snippets_data=[
            {"language": "tsx", "code": "const [val, setVal] = useState(0);", "line_count": 1}
        ],
        api_symbols_data=[
            {"name": "useState", "signature": "useState<T>(initial: T)", "is_deprecated": False},
            {"name": "findDOMNode", "signature": "findDOMNode(instance)", "is_deprecated": True},
        ],
    )

    md = MarkdownCompiler.compile(doc)
    assert "# React APIs" in md
    assert 'source_url: "https://react.dev/reference/react"' in md
    assert "useState<T>" in md
    assert "Deprecation Alert:" in md
    assert "findDOMNode" in md

    agents_md = AgentsMdCompiler.compile("React Docs", [doc])
    assert "AGENTS.md — React Docs Knowledge Contract" in agents_md
    assert "Deprecated APIs (DO NOT USE)" in agents_md
    assert "findDOMNode" in agents_md

    skill_md = SkillMdCompiler.compile("Manage State", doc)
    assert "name: manage-state" in skill_md
    assert "Derived from official documentation: [React APIs]" in skill_md

    llms_txt = LLMsTxtCompiler.compile("React Docs", "https://react.dev", [doc])
    assert "# React APIs" in md
    assert "[React APIs](https://react.dev/reference/react)" in llms_txt


@pytest.mark.asyncio
async def test_compiler_pipeline_workflow():
    import uuid

    uid = uuid.uuid4().hex[:8]

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 1. Setup user, org, source, and pages
    async with AsyncSessionLocal() as session:
        user = User(
            email=f"compiler_{uid}@devknowledge.dev",
            password_hash="hash",
            display_name="Compiler Tester",
        )
        session.add(user)
        await session.flush()

        org = Organization(
            name=f"Compiler Org {uid}", slug=f"compiler-org-{uid}", owner_user_id=user.id
        )
        session.add(org)
        await session.flush()

        member = OrganizationMember(organization_id=org.id, user_id=user.id, role="owner")
        session.add(member)

        source = DocumentationSource(
            organization_id=org.id,
            name="Android Jetpack",
            root_url=f"https://developer.android.com/jetpack-{uid}",
            canonical_domain="developer.android.com",
            category="mobile-development",
            status="active",
        )
        session.add(source)
        await session.flush()

        page1 = DocumentationPage(
            source_id=source.id,
            canonical_url=f"https://developer.android.com/jetpack-{uid}/compose",
            normalized_path="/jetpack/compose",
            title="Jetpack Compose",
            current_content_hash="hash_compose_1",
            page_status="indexed",
        )
        session.add(page1)
        await session.commit()

    # 2. Test Compilation API
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register user for API test
        reg_res = await client.post(
            "/api/v1/auth/register",
            json={
                "email": f"api_user_{uid}@devknowledge.dev",
                "password": "Password123!",
                "display_name": "User",
            },
        )
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Register source for this user
        create_src = await client.post(
            "/api/v1/sources",
            json={
                "root_url": f"https://example.org/compiler-test-{uid}",
                "name": "Compile Test Source",
            },
            headers=headers,
        )
        src_id = create_src.json()["id"]

        # Trigger compilation
        comp_res = await client.post(f"/api/v1/sources/{src_id}/compile", headers=headers)
        assert comp_res.status_code == 201
        comp_data = comp_res.json()
        assert comp_data["version_number"] == 1
        assert "snapshot_id" in comp_data

        # Verify Manifest endpoint
        man_res = await client.get(f"/api/v1/sources/{src_id}/manifest", headers=headers)
        assert man_res.status_code == 200
        man_data = man_res.json()
        assert man_data["source_id"] == src_id
        assert man_data["version_number"] == 1
        assert len(man_data["documents"]) >= 1

        # Verify Artifacts list
        art_res = await client.get(f"/api/v1/sources/{src_id}/artifacts", headers=headers)
        assert art_res.status_code == 200
        artifacts = art_res.json()
        types = [a["artifact_type"] for a in artifacts]
        assert "llms_txt" in types
        assert "llms_full_txt" in types
        assert "agents_md" in types
        assert "skill_md" in types

        # Retrieve raw llms.txt content
        llms_res = await client.get(f"/api/v1/sources/{src_id}/artifacts/llms_txt", headers=headers)
        assert llms_res.status_code == 200
        assert "# Compile Test Source" in llms_res.text
        assert "llms-full.txt" in llms_res.text
