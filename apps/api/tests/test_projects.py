import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.app.database.session import Base, engine
from apps.api.app.main import app
from apps.api.app.projects.parsers import DependencyManifestParser

SAMPLE_PACKAGE_JSON = """
{
  "name": "my-app",
  "dependencies": {
    "react": "^18.2.0",
    "next": "14.2.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
"""

SAMPLE_CARGO_TOML = """
[package]
name = "my-service"
version = "0.1.0"

[dependencies]
tokio = "1.38"
serde = { version = "1.0", features = ["derive"] }
axum = "0.7"
"""


def test_dependency_parsers():
    # 1. Test package.json
    npm_deps = DependencyManifestParser.parse_package_json(SAMPLE_PACKAGE_JSON)
    assert len(npm_deps) == 3
    pkgs = {d.package_name: d.version_constraint for d in npm_deps}
    assert "react" in pkgs
    assert pkgs["react"] == "^18.2.0"
    assert "typescript" in pkgs

    # 2. Test Cargo.toml
    cargo_deps = DependencyManifestParser.parse_cargo_toml(SAMPLE_CARGO_TOML)
    assert len(cargo_deps) >= 2
    cargo_pkgs = {d.package_name: d.version_constraint for d in cargo_deps}
    assert "tokio" in cargo_pkgs
    assert cargo_pkgs["tokio"] == "1.38"


@pytest.mark.asyncio
async def test_project_intelligence_workflow():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    uid = uuid.uuid4().hex[:6]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register user
        reg_res = await client.post(
            "/api/v1/auth/register",
            json={
                "email": f"proj_{uid}@devknowledge.dev",
                "password": "Password123!",
                "display_name": "Project Lead",
            },
        )
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Register a documentation source for React version 19
        await client.post(
            "/api/v1/sources",
            json={
                "root_url": f"https://react.dev/learn-{uid}",
                "name": "React Documentation",
                "category": "frontend-development",
                "version": "19.0.0",
            },
            headers=headers,
        )

        # 2. Create Project Profile
        proj_res = await client.post(
            "/api/v1/projects",
            json={
                "name": "Frontend Dashboard",
                "description": "Next.js & React enterprise dashboard",
            },
            headers=headers,
        )
        assert proj_res.status_code == 201
        proj_data = proj_res.json()
        proj_id = proj_data["id"]
        assert proj_data["name"] == "Frontend Dashboard"

        # 3. Import package.json into project
        import_res = await client.post(
            f"/api/v1/projects/{proj_id}/dependencies/import",
            json={"filename": "package.json", "content": SAMPLE_PACKAGE_JSON},
            headers=headers,
        )
        assert import_res.status_code == 201
        imported_deps = import_res.json()
        assert len(imported_deps) == 3

        # 4. Check project knowledge and version warnings
        know_res = await client.get(f"/api/v1/projects/{proj_id}/knowledge", headers=headers)
        assert know_res.status_code == 200
        know_data = know_res.json()
        assert know_data["project_id"] == proj_id

        # Notice:
        # - React was declared as ^18.2.0, but available doc is 19.0.0 -> version_mismatch warning!
        # - Next.js and Typescript have no registered docs -> missing_documentation warnings!
        warnings = know_data["version_warnings"]
        warning_types = [w["warning_type"] for w in warnings]
        assert "version_mismatch" in warning_types
        assert "missing_documentation" in warning_types
