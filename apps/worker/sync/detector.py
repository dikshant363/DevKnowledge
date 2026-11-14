from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.database.models import (
    DocumentationPage,
    SyncEvent,
)
from apps.worker.crawler.extractor import ExtractedDocument


class ChangeClassification:
    NO_CHANGE = "no_change"
    CONTENT_UPDATE = "content_update"
    API_SIGNATURE_CHANGE = "api_signature_change"
    DEPRECATION_ADDED = "deprecation_added"
    NEW_PAGE = "new_page"
    DELETED_PAGE = "deleted_page"


class ContentChangeDetector:
    """
    Compares newly extracted content against previous page version,
    classifies changes, and generates an audit SyncEvent.
    """

    @classmethod
    def compare_and_classify(
        cls,
        existing_page: Optional[DocumentationPage],
        extracted: ExtractedDocument,
    ) -> Tuple[str, Optional[Dict[str, Any]]]:
        if not existing_page:
            return ChangeClassification.NEW_PAGE, {
                "title": extracted.title,
                "sections_count": len(extracted.sections),
            }

        if existing_page.current_content_hash == extracted.content_hash:
            return ChangeClassification.NO_CHANGE, None

        # Content has changed — classify depth of change
        details: Dict[str, Any] = {
            "previous_hash": existing_page.current_content_hash,
            "new_hash": extracted.content_hash,
        }

        # Check for deprecation notices
        deprecated_syms = [s["name"] for s in extracted.api_symbols if s.get("is_deprecated")]
        if deprecated_syms:
            details["deprecated_symbols"] = deprecated_syms
            return ChangeClassification.DEPRECATION_ADDED, details

        # Check for API signature modifications
        if extracted.api_symbols:
            details["api_symbols_count"] = len(extracted.api_symbols)
            return ChangeClassification.API_SIGNATURE_CHANGE, details

        return ChangeClassification.CONTENT_UPDATE, details

    @classmethod
    async def record_sync_event(
        cls,
        db: AsyncSession,
        source_id: str,
        page_id: Optional[str],
        classification: str,
        previous_hash: Optional[str],
        new_hash: Optional[str],
        details: Optional[Dict[str, Any]] = None,
    ) -> SyncEvent:
        event = SyncEvent(
            source_id=source_id,
            page_id=page_id,
            event_type="sync_revalidation",
            previous_hash=previous_hash,
            new_hash=new_hash,
            classification=classification,
            status="processed",
            details=details or {},
            detected_at=datetime.now(timezone.utc),
            published_at=datetime.now(timezone.utc)
            if classification != ChangeClassification.NO_CHANGE
            else None,
        )
        db.add(event)
        await db.commit()
        return event
