import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.app.database.session import Base, engine
from apps.api.app.main import app


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_source_registry_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register test user to obtain token
        reg_res = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "lead@developer.dev",
                "password": "Password12345!",
                "display_name": "Tech Lead",
            },
        )
        assert reg_res.status_code == 201
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Reject SSRF attack attempt (private IP)
        bad_ssrf = await client.post(
            "/api/v1/sources",
            json={"root_url": "http://127.0.0.1:8000/internal"},
            headers=headers,
        )
        assert bad_ssrf.status_code == 400
        assert "Invalid or prohibited documentation URL" in bad_ssrf.json()["detail"]

        # 3. Reject bad scheme
        bad_scheme = await client.post(
            "/api/v1/sources",
            json={"root_url": "file:///etc/hosts"},
            headers=headers,
        )
        assert bad_scheme.status_code == 400

        # 4. Register valid documentation URL
        valid_res = await client.post(
            "/api/v1/sources",
            json={
                "root_url": "https://example.com/docs/",
                "name": "Example Documentation",
                "category": "general",
                "crawl_config": {
                    "max_pages": 500,
                    "max_depth": 3,
                },
            },
            headers=headers,
        )
        assert valid_res.status_code == 201
        source_data = valid_res.json()
        assert source_data["name"] == "Example Documentation"
        assert source_data["root_url"] == "https://example.com/docs/"
        assert source_data["status"] == "queued"
        source_id = source_data["id"]

        # 5. Reject duplicate source registration within same org
        dup_res = await client.post(
            "/api/v1/sources",
            json={"root_url": "https://example.com/docs/"},
            headers=headers,
        )
        assert dup_res.status_code == 409

        # 6. List sources
        list_res = await client.get("/api/v1/sources", headers=headers)
        assert list_res.status_code == 200
        list_data = list_res.json()
        assert list_data["total"] == 1
        assert list_data["items"][0]["id"] == source_id

        # 7. Get specific source
        get_res = await client.get(f"/api/v1/sources/{source_id}", headers=headers)
        assert get_res.status_code == 200
        assert get_res.json()["id"] == source_id

        # 8. Check source status
        status_res = await client.get(f"/api/v1/sources/{source_id}/status", headers=headers)
        assert status_res.status_code == 200
        assert status_res.json()["status"] == "queued"

        # 9. Update source crawl config
        patch_res = await client.patch(
            f"/api/v1/sources/{source_id}",
            json={"crawl_config": {"max_pages": 1200, "max_depth": 6}},
            headers=headers,
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["crawl_config"]["max_pages"] == 1200

        # 10. Trigger immediate sync
        sync_res = await client.post(f"/api/v1/sources/{source_id}/sync", headers=headers)
        assert sync_res.status_code == 202
        assert "job_id" in sync_res.json()

        # 11. Delete source
        del_res = await client.delete(f"/api/v1/sources/{source_id}", headers=headers)
        assert del_res.status_code == 204

        # Verify it is gone
        check_del = await client.get(f"/api/v1/sources/{source_id}", headers=headers)
        assert check_del.status_code == 404
