import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from apps.api.app.main import app
from apps.api.app.database.session import Base, engine, AsyncSessionLocal
from apps.api.app.database.models import DocumentationSource, DocumentationPage


@pytest.mark.asyncio
async def test_search_and_retrieval_workflow():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register User A (Org A)
        uid_a = uuid.uuid4().hex[:6]
        res_a = await client.post(
            "/api/v1/auth/register",
            json={"email": f"search_a_{uid_a}@devknowledge.dev", "password": "Password123!", "display_name": "Dev A"},
        )
        token_a = res_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # 2. Register Source in Org A
        src_a = (await client.post(
            "/api/v1/sources",
            json={"root_url": f"https://rust-lang.org/learn-{uid_a}", "name": "Rust Systems Guide", "category": "systems-programming"},
            headers=headers_a,
        )).json()
        src_a_id = src_a["id"]

        # Insert page into Org A
        async with AsyncSessionLocal() as db:
            p1 = DocumentationPage(
                source_id=src_a_id,
                canonical_url=f"https://rust-lang.org/learn-{uid_a}/ownership.html",
                normalized_path="/ownership.html",
                title="Understanding Ownership in Rust",
                current_content_hash="h_rust_1",
                page_status="indexed",
            )
            db.add(p1)
            await db.commit()
            p1_id = p1.id

        # 3. Perform GET /api/v1/search
        search_res = await client.get("/api/v1/search?q=ownership", headers=headers_a)
        assert search_res.status_code == 200
        search_data = search_res.json()
        assert search_data["total"] >= 1
        item = search_data["results"][0]
        assert item["title"] == "Understanding Ownership in Rust"
        assert item["canonical_url"] == f"https://rust-lang.org/learn-{uid_a}/ownership.html"
        assert item["source_name"] == "Rust Systems Guide"
        assert item["score"] > 1.0

        # 4. Perform POST /api/v1/search with category filter
        post_search = await client.post(
            "/api/v1/search",
            json={"q": "rust", "category": "systems-programming", "limit": 5},
            headers=headers_a,
        )
        assert post_search.status_code == 200
        assert post_search.json()["total"] >= 1

        # 5. Get document details
        doc_res = await client.get(f"/api/v1/documents/{p1_id}", headers=headers_a)
        assert doc_res.status_code == 200
        doc_data = doc_res.json()
        assert doc_data["title"] == "Understanding Ownership in Rust"
        assert doc_data["canonical_url"] == f"https://rust-lang.org/learn-{uid_a}/ownership.html"

        # 6. Multitenant isolation verification:
        # Register User B (Org B)
        uid_b = uuid.uuid4().hex[:6]
        res_b = await client.post(
            "/api/v1/auth/register",
            json={"email": f"search_b_{uid_b}@devknowledge.dev", "password": "Password123!", "display_name": "Dev B"},
        )
        token_b = res_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # User B searches for "ownership" -> should return 0 results!
        search_b = await client.get("/api/v1/search?q=ownership", headers=headers_b)
        assert search_b.status_code == 200
        assert search_b.json()["total"] == 0

        # User B attempts to access Org A's document directly -> 404 Not Found!
        get_b = await client.get(f"/api/v1/documents/{p1_id}", headers=headers_b)
        assert get_b.status_code == 404
