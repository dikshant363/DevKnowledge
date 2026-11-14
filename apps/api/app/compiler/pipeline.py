import os
import hashlib
import json
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.app.config import get_settings
from apps.api.app.database.models import (
    DocumentationSource,
    DocumentationPage,
    SourceSnapshot,
    PageVersion,
    GeneratedArtifact,
)
from apps.api.app.compiler.ckr import CKRDocument
from apps.api.app.compiler.targets import (
    MarkdownCompiler,
    LLMsTxtCompiler,
    LLMsFullTxtCompiler,
    AgentsMdCompiler,
    SkillMdCompiler,
)

settings = get_settings()


class CompilerPipeline:
    """
    Compiles documentation pages into CKR, produces artifacts,
    records immutable snapshots, and atomically publishes the release.
    """

    @staticmethod
    async def compile_source_snapshot(
        db: AsyncSession,
        source: DocumentationSource,
    ) -> SourceSnapshot:
        # 1. Fetch all indexed pages for this source
        result = await db.execute(
            select(DocumentationPage).where(
                and_(
                    DocumentationPage.source_id == source.id,
                    DocumentationPage.page_status == "indexed",
                )
            ).order_by(DocumentationPage.normalized_path.asc())
        )
        pages = list(result.scalars().all())

        # If no pages exist yet, create a synthetic root CKR document
        if not pages:
            synthetic_page = DocumentationPage(
                source_id=source.id,
                canonical_url=source.root_url,
                normalized_path="/",
                title=source.name,
                current_content_hash="init_hash",
                page_status="indexed",
            )
            db.add(synthetic_page)
            await db.flush()
            pages = [synthetic_page]

        # 2. Build CKR documents
        ckr_docs: List[CKRDocument] = []
        for p in pages:
            ckr_doc = CKRDocument.from_page_and_extracted(
                document_id=p.id,
                source_id=source.id,
                canonical_url=p.canonical_url,
                normalized_path=p.normalized_path,
                title=p.title,
                sections_data=[{"id": "main", "heading": p.title, "level": 1, "content": f"Documentation content for {p.title}", "content_hash": p.current_content_hash}],
                code_snippets_data=[],
                api_symbols_data=[],
                source_version=source.source_version,
            )
            ckr_docs.append(ckr_doc)

        # 3. Compute aggregate snapshot hash
        combined_hashes = "".join(d.content_hash for d in ckr_docs)
        snapshot_hash = hashlib.sha256(combined_hashes.encode("utf-8")).hexdigest()

        # 4. Resolve next version number
        last_snap_res = await db.execute(
            select(func.max(SourceSnapshot.version_number)).where(
                SourceSnapshot.source_id == source.id
            )
        )
        last_ver = last_snap_res.scalar() or 0
        new_ver = last_ver + 1

        # 5. Create immutable snapshot record
        snapshot = SourceSnapshot(
            source_id=source.id,
            version_number=new_ver,
            snapshot_hash=snapshot_hash,
            page_count=len(ckr_docs),
            compiler_version="1.0.0",
            status="published",
            published_at=datetime.now(timezone.utc),
        )
        db.add(snapshot)
        await db.flush()

        # 6. Generate artifacts on disk
        artifact_base_dir = Path(settings.ARTIFACTS_DIR) / source.id / snapshot.id
        artifact_base_dir.mkdir(parents=True, exist_ok=True)

        # A. llms.txt
        llms_txt = LLMsTxtCompiler.compile(source.name, source.root_url, ckr_docs)
        llms_txt_path = artifact_base_dir / "llms.txt"
        llms_txt_path.write_text(llms_txt, encoding="utf-8")
        db.add(GeneratedArtifact(
            source_id=source.id,
            snapshot_id=snapshot.id,
            artifact_type="llms_txt",
            artifact_version="1.0.0",
            storage_location=str(llms_txt_path),
            checksum=hashlib.sha256(llms_txt.encode("utf-8")).hexdigest(),
        ))

        # B. llms-full.txt
        llms_full_txt = LLMsFullTxtCompiler.compile(source.name, ckr_docs)
        llms_full_path = artifact_base_dir / "llms-full.txt"
        llms_full_path.write_text(llms_full_txt, encoding="utf-8")
        db.add(GeneratedArtifact(
            source_id=source.id,
            snapshot_id=snapshot.id,
            artifact_type="llms_full_txt",
            artifact_version="1.0.0",
            storage_location=str(llms_full_path),
            checksum=hashlib.sha256(llms_full_txt.encode("utf-8")).hexdigest(),
        ))

        # C. AGENTS.md
        agents_md = AgentsMdCompiler.compile(source.name, ckr_docs)
        agents_md_path = artifact_base_dir / "AGENTS.md"
        agents_md_path.write_text(agents_md, encoding="utf-8")
        db.add(GeneratedArtifact(
            source_id=source.id,
            snapshot_id=snapshot.id,
            artifact_type="agents_md",
            artifact_version="1.0.0",
            storage_location=str(agents_md_path),
            checksum=hashlib.sha256(agents_md.encode("utf-8")).hexdigest(),
        ))

        # D. SKILL.md
        skill_md = SkillMdCompiler.compile(f"Use {source.name}", ckr_docs[0])
        skill_md_path = artifact_base_dir / "SKILL.md"
        skill_md_path.write_text(skill_md, encoding="utf-8")
        db.add(GeneratedArtifact(
            source_id=source.id,
            snapshot_id=snapshot.id,
            artifact_type="skill_md",
            artifact_version="1.0.0",
            storage_location=str(skill_md_path),
            checksum=hashlib.sha256(skill_md.encode("utf-8")).hexdigest(),
        ))

        # E. Manifest location
        manifest_data = {
            "source_id": source.id,
            "source_name": source.name,
            "snapshot_id": snapshot.id,
            "version_number": new_ver,
            "snapshot_hash": snapshot_hash,
            "page_count": len(ckr_docs),
            "documents": [
                {
                    "document_id": d.document_id,
                    "canonical_url": d.canonical_url,
                    "title": d.title,
                    "content_hash": d.content_hash,
                }
                for d in ckr_docs
            ],
            "published_at": snapshot.published_at.isoformat(),
        }
        manifest_path = artifact_base_dir / "manifest.json"
        manifest_path.write_text(json.dumps(manifest_data, indent=2), encoding="utf-8")
        snapshot.manifest_location = str(manifest_path)

        # 7. Atomic Publication: update active_snapshot_id on source
        source.active_snapshot_id = snapshot.id
        source.last_successful_sync_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(snapshot)

        return snapshot
