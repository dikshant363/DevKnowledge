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
async def test_auth_workflow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register new user
        reg_payload = {
            "email": "engineer@acme.dev",
            "password": "SecurePassword123!",
            "display_name": "Senior Engineer",
            "organization_name": "Acme Robotics",
        }
        res = await client.post("/api/v1/auth/register", json=reg_payload)
        assert res.status_code == 201
        data = res.json()
        assert "access_token" in data
        assert data["user"]["email"] == "engineer@acme.dev"
        assert data["organization"]["name"] == "Acme Robotics"
        token = data["access_token"]

        # 2. Duplicate registration rejected
        dup_res = await client.post("/api/v1/auth/register", json=reg_payload)
        assert dup_res.status_code == 409

        # 3. Login with credentials
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "engineer@acme.dev", "password": "SecurePassword123!"},
        )
        assert login_res.status_code == 200
        assert "access_token" in login_res.json()

        # 4. Invalid login rejected
        bad_login = await client.post(
            "/api/v1/auth/login",
            json={"email": "engineer@acme.dev", "password": "WrongPassword"},
        )
        assert bad_login.status_code == 401

        # 5. Access /me endpoint
        me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["user"]["email"] == "engineer@acme.dev"
        assert me_data["organization"]["name"] == "Acme Robotics"
