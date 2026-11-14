import hashlib
from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.database.models import GeneratedArtifact, SourceSnapshot
from apps.api.app.storage.backend import StorageBackend, get_storage_backend


async def verify_artifact_checksum(
    storage: StorageBackend,
    storage_location: str,
    expected_checksum: str,
) -> bool:
    """
    Verifies that the file at storage_location matches the expected SHA-256 checksum.
    """
    try:
        # Extract storage key if formatted as URI
        key = storage_location
        if key.startswith("r2://"):
            parts = key.split("/", 3)
            key = parts[3] if len(parts) > 3 else key

        data = await storage.get_object(key)
        computed = hashlib.sha256(data).hexdigest()
        return computed == expected_checksum
    except Exception:
        return False


async def verify_snapshot_integrity(
    db: AsyncSession,
    snapshot_id: str,
    storage: Optional[StorageBackend] = None,
) -> Dict[str, object]:
    """
    Performs full cryptographic audit of all artifacts associated with a snapshot.
    """
    backend = storage or get_storage_backend()

    snapshot_res = await db.execute(select(SourceSnapshot).where(SourceSnapshot.id == snapshot_id))
    snapshot = snapshot_res.scalar_one_or_none()
    if not snapshot:
        return {"valid": False, "error": f"Snapshot not found: {snapshot_id}"}

    artifacts_res = await db.execute(
        select(GeneratedArtifact).where(GeneratedArtifact.snapshot_id == snapshot_id)
    )
    artifacts: List[GeneratedArtifact] = list(artifacts_res.scalars().all())

    checked = []
    all_valid = True

    for art in artifacts:
        is_ok = await verify_artifact_checksum(backend, art.storage_location, art.checksum)
        checked.append(
            {
                "artifact_id": art.id,
                "artifact_type": art.artifact_type,
                "storage_location": art.storage_location,
                "expected_checksum": art.checksum,
                "verified": is_ok,
            }
        )
        if not is_ok:
            all_valid = False

    return {
        "valid": all_valid and len(artifacts) > 0,
        "snapshot_id": snapshot_id,
        "snapshot_hash": snapshot.snapshot_hash,
        "artifacts_checked": checked,
        "total_artifacts": len(artifacts),
    }
