import hashlib
import tempfile
import uuid

import pytest

from apps.api.app.config import Settings
from apps.api.app.database.models import (
    Base,
    DocumentationSource,
    GeneratedArtifact,
    Organization,
    SourceSnapshot,
    User,
)
from apps.api.app.database.session import AsyncSessionLocal, engine
from apps.api.app.storage.backend import (
    LocalStorageBackend,
    R2StorageBackend,
    get_storage_backend,
)
from apps.api.app.storage.integrity import verify_snapshot_integrity


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest.mark.asyncio
async def test_local_storage_backend_lifecycle():
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = LocalStorageBackend(base_dir=tmpdir)

        # 1. Put object
        key = "source-123/snapshot-1/llms.txt"
        data = "# Project Documentation Index\n> Official Reference"
        path = await storage.put_object(key, data, content_type="text/plain")
        assert path.endswith("llms.txt")

        # 2. Exists
        exists = await storage.exists(key)
        assert exists is True

        # 3. Get object
        retrieved = await storage.get_object(key)
        assert retrieved.decode("utf-8") == data

        # 4. Total usage bytes
        usage = await storage.get_total_usage_bytes()
        assert usage == len(data.encode("utf-8"))

        # 5. Delete object
        deleted = await storage.delete_object(key)
        assert deleted is True
        assert (await storage.exists(key)) is False


def test_storage_backend_factory():
    # Local default
    settings_local = Settings(STORAGE_BACKEND="local")
    backend_local = get_storage_backend(settings_local)
    assert isinstance(backend_local, LocalStorageBackend)

    # R2 configured
    settings_r2 = Settings(
        STORAGE_BACKEND="r2",
        R2_ACCOUNT_ID="mock_account_123",
        R2_ACCESS_KEY_ID="mock_key",
        R2_SECRET_ACCESS_KEY="mock_secret",
        R2_BUCKET_NAME="devknowledge-test",
    )
    backend_r2 = get_storage_backend(settings_r2)
    assert isinstance(backend_r2, R2StorageBackend)
    assert backend_r2.bucket_name == "devknowledge-test"
    assert "mock_account_123" in backend_r2.endpoint_url


@pytest.mark.asyncio
async def test_snapshot_cryptographic_integrity():
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = LocalStorageBackend(base_dir=tmpdir)

        async with AsyncSessionLocal() as db:
            user = User(
                email=f"audit_{uuid.uuid4().hex[:6]}@example.dev",
                password_hash="mock_hash",
                display_name="Audit Developer",
                account_status="active",
            )
            db.add(user)
            await db.flush()

            org = Organization(
                name="Audit Org",
                slug=f"audit-{uuid.uuid4().hex[:6]}",
                owner_user_id=user.id,
            )
            db.add(org)
            await db.flush()

            source = DocumentationSource(
                organization_id=org.id,
                name="Integrity Source",
                root_url="https://integrity.example.com",
                canonical_domain="integrity.example.com",
                category="general",
                documentation_type="library",
            )
            db.add(source)
            await db.flush()

            snapshot = SourceSnapshot(
                source_id=source.id,
                version_number=1,
                snapshot_hash="mock_snap_hash",
                page_count=5,
                compiler_version="1.0.0",
                status="published",
            )
            db.add(snapshot)
            await db.flush()

            # Store artifact
            content = "## Secure Content Verified"
            content_bytes = content.encode("utf-8")
            content_hash = hashlib.sha256(content_bytes).hexdigest()
            loc = await storage.put_object(
                f"{source.id}/{snapshot.id}/AGENTS.md", content, "text/markdown"
            )

            artifact = GeneratedArtifact(
                source_id=source.id,
                snapshot_id=snapshot.id,
                artifact_type="agents_md",
                artifact_version="1.0.0",
                storage_location=loc,
                checksum=content_hash,
            )
            db.add(artifact)
            await db.commit()

            # Audit integrity -> must PASS
            audit = await verify_snapshot_integrity(db, snapshot.id, storage=storage)
            assert audit["valid"] is True
            assert audit["total_artifacts"] == 1
            assert audit["artifacts_checked"][0]["verified"] is True
