from typing import List, Optional, Tuple
from urllib.parse import urlparse, urlunparse

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.database.models import DiscoveryCandidate, DocumentationSource


class DuplicateDetector:
    """
    Prevents duplicate candidate creation and duplicate source registration.
    Normalizes URLs and checks domain mirrors.
    """

    @classmethod
    def normalize_url(cls, url: str) -> str:
        parsed = urlparse(url.strip())
        scheme = parsed.scheme.lower() or "https"
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]

        path = parsed.path.rstrip("/")
        if not path:
            path = "/"

        return urlunparse((scheme, netloc, path, "", "", ""))

    @classmethod
    def extract_canonical_domain(cls, url: str) -> str:
        parsed = urlparse(url.strip())
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        return netloc

    @classmethod
    def is_domain_blacklisted(cls, domain: str, blacklist: List[str]) -> bool:
        clean_domain = domain.lower()
        for b in blacklist:
            clean_b = b.lower().strip()
            if clean_domain == clean_b or clean_domain.endswith(f".{clean_b}"):
                return True
        return False

    @classmethod
    async def check_duplicate(
        cls,
        db: AsyncSession,
        candidate_url: str,
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Returns (is_duplicate, duplicate_type, entity_id)
        """
        normalized = cls.normalize_url(candidate_url)
        domain = cls.extract_canonical_domain(candidate_url)

        # 1. Check existing DocumentationSource
        src_res = await db.execute(
            select(DocumentationSource).where(
                or_(
                    DocumentationSource.root_url == normalized,
                    DocumentationSource.canonical_domain == domain,
                )
            )
        )
        existing_source = src_res.scalar_one_or_none()
        if existing_source:
            return True, "documentation_source", existing_source.id

        # 2. Check existing DiscoveryCandidate
        cand_res = await db.execute(
            select(DiscoveryCandidate).where(
                or_(
                    DiscoveryCandidate.candidate_url == normalized,
                    DiscoveryCandidate.canonical_domain == domain,
                )
            )
        )
        existing_cand = cand_res.scalar_one_or_none()
        if existing_cand:
            return True, "discovery_candidate", existing_cand.id

        return False, None, None
