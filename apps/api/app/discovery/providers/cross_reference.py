from typing import List, Optional
from urllib.parse import urlparse

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.database.models import DocumentationPage
from apps.api.app.discovery.providers.base import DiscoveredCandidateDTO, DiscoveryProvider

logger = structlog.get_logger()


class CrossReferenceProvider(DiscoveryProvider):
    """
    Discovers documentation websites by extracting external documentation links
    from already indexed documentation pages.
    """

    provider_name = "cross_reference"
    display_name = "Cross-Documentation References"
    default_quota_limit = 5000  # Local database query

    def __init__(self, db: Optional[AsyncSession] = None):
        self._db = db

    async def discover(self, query: str, limit: int = 10) -> List[DiscoveredCandidateDTO]:
        results: List[DiscoveredCandidateDTO] = []
        if not self._db:
            return results

        clean_q = query.strip().lower()

        try:
            # Query pages containing links to known doc patterns
            res = await self._db.execute(
                select(DocumentationPage.canonical_url)
                .where(DocumentationPage.canonical_url.ilike(f"%{clean_q}%"))
                .limit(limit * 2)
            )
            urls = res.scalars().all()
            seen_domains = set()

            for u in urls:
                parsed = urlparse(u)
                domain = parsed.netloc.lower()
                if domain not in seen_domains and any(
                    kw in domain or kw in parsed.path
                    for kw in ["docs", "api", "reference", "guide"]
                ):
                    seen_domains.add(domain)
                    results.append(
                        DiscoveredCandidateDTO(
                            candidate_url=f"{parsed.scheme}://{domain}",
                            technology_name=clean_q.capitalize(),
                            category="library",
                            documentation_type="api_reference",
                            provider_name=self.provider_name,
                            confidence_score=0.75,
                            evidence={
                                "cross_referenced_from": u,
                                "canonical_domain": domain,
                            },
                        )
                    )
                    if len(results) >= limit:
                        break
        except Exception as e:
            logger.warning("Cross reference extraction error", error=str(e))

        return results
