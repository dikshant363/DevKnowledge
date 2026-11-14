import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.app.database.models import DocumentationPage
from apps.api.app.database.session import AsyncSessionLocal, Base, engine
from apps.api.app.main import app
from apps.worker.crawler.extractor import ExtractedDocument
from apps.worker.sync.detector import ChangeClassification, ContentChangeDetector


def test_change_classifier():
    # 1. No change when hashes match
    page = DocumentationPage(
        source_id="src-1",
        canonical_url="https://docs.rs/tokio",
        normalized_path="/tokio",
        title="Tokio",
        current_content_hash="hash_same",
    )
    doc_same = ExtractedDocument(
        title="Tokio",
        adapter_used="generic",
        sections=[],
        code_snippets=[],
        api_symbols=[],
        raw_markdown="",
        content_hash="hash_same",
    )
    classification, _ = ContentChangeDetector.compare_and_classify(page, doc_same)
    assert classification == ChangeClassification.NO_CHANGE

    # 2. Content update
    doc_diff = ExtractedDocument(
        title="Tokio",
        adapter_used="generic",
        sections=[],
        code_snippets=[],
        api_symbols=[],
        raw_markdown="",
        content_hash="hash_new_123",
    )
    classification, details = ContentChangeDetector.compare_and_classify(page, doc_diff)
    assert classification == ChangeClassification.CONTENT_UPDATE
    assert details["previous_hash"] == "hash_same"
    assert details["new_hash"] == "hash_new_123"

    # 3. Deprecation added
    doc_dep = ExtractedDocument(
        title="Tokio",
        adapter_used="generic",
        sections=[],
        code_snippets=[],
        api_symbols=[{"name": "old_spawn", "is_deprecated": True}],
        raw_markdown="",
        content_hash="hash_dep_123",
    )
    classification, details = ContentChangeDetector.compare_and_classify(page, doc_dep)
    assert classification == ChangeClassification.DEPRECATION_ADDED
    assert "old_spawn" in details["deprecated_symbols"]


@pytest.mark.asyncio
async def test_snapshot_diff_and_rollback_workflow():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    uid = uuid.uuid4().hex[:8]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register user
        reg_res = await client.post(
            "/api/v1/auth/register",
            json={
                "email": f"sync_{uid}@devknowledge.dev",
                "password": "Password123!",
                "display_name": "Sync Lead",
            },
        )
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Register source
        create_src = await client.post(
            "/api/v1/sources",
            json={
                "root_url": f"https://kotlinlang.org/docs-{uid}/home.html",
                "name": "Kotlin Docs",
            },
            headers=headers,
        )
        src_id = create_src.json()["id"]

        # 1. Compile Snapshot v1
        snap1_res = await client.post(f"/api/v1/sources/{src_id}/compile", headers=headers)
        assert snap1_res.status_code == 201
        snap1_id = snap1_res.json()["snapshot_id"]
        assert snap1_res.json()["version_number"] == 1

        # 2. Add an additional page in DB and compile Snapshot v2
        async with AsyncSessionLocal() as db:
            p2 = DocumentationPage(
                source_id=src_id,
                canonical_url=f"https://kotlinlang.org/docs-{uid}/coroutines.html",
                normalized_path="/coroutines.html",
                title="Coroutines",
                current_content_hash="hash_coro_1",
                page_status="indexed",
            )
            db.add(p2)
            await db.commit()

        snap2_res = await client.post(f"/api/v1/sources/{src_id}/compile", headers=headers)
        assert snap2_res.status_code == 201
        snap2_id = snap2_res.json()["snapshot_id"]
        assert snap2_res.json()["version_number"] == 2

        # 3. Check diff between v2 and v1
        diff_res = await client.get(f"/api/v1/snapshots/{snap2_id}/diff", headers=headers)
        assert diff_res.status_code == 200
        diff_data = diff_res.json()
        assert diff_data["target_snapshot_id"] == snap2_id
        assert diff_data["base_snapshot_id"] == snap1_id
        assert len(diff_data["added_pages"]) == 1
        assert f"https://kotlinlang.org/docs-{uid}/coroutines.html" in diff_data["added_pages"]

        # 4. Check active snapshot on source before rollback
        source_before = (await client.get(f"/api/v1/sources/{src_id}", headers=headers)).json()
        assert source_before["active_snapshot_id"] == snap2_id

        # 5. Rollback to Snapshot v1
        rollback_res = await client.post(
            f"/api/v1/sources/{src_id}/rollback",
            json={"target_snapshot_id": snap1_id},
            headers=headers,
        )
        assert rollback_res.status_code == 200
        rollback_data = rollback_res.json()
        assert rollback_data["active_snapshot_id"] == snap1_id
        assert rollback_data["active_version_number"] == 1

        # Verify source active_snapshot_id is now v1
        source_after = (await client.get(f"/api/v1/sources/{src_id}", headers=headers)).json()
        assert source_after["active_snapshot_id"] == snap1_id
