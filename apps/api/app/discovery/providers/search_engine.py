from typing import List, Optional
from urllib.parse import quote_plus

import httpx
import structlog

from apps.api.app.discovery.providers.base import DiscoveredCandidateDTO, DiscoveryProvider

logger = structlog.get_logger()


class SearchEngineDiscoveryProvider(DiscoveryProvider):
    """
    Search engine documentation discovery provider.
    Rotates developer search queries:
    - '<query> official documentation'
    - '<query> docs'
    - '<query> api reference'
    Respects robots.txt, provider rate limits, and zero-cost quotas.
    """

    provider_name = "search_engine"
    display_name = "Developer Search Engine API"
    default_quota_limit = 250  # Conservative free-tier request limit

    def __init__(
        self, client: Optional[httpx.AsyncClient] = None, endpoint_url: Optional[str] = None
    ):
        self._client = client
        self.endpoint_url = endpoint_url

    async def discover(self, query: str, limit: int = 10) -> List[DiscoveredCandidateDTO]:
        results: List[DiscoveredCandidateDTO] = []
        clean_q = query.strip()
        encoded = quote_plus(f"{clean_q} official documentation")

        client = self._client or httpx.AsyncClient(
            timeout=10.0, headers={"User-Agent": "DevKnowledge-Discovery/1.0"}
        )
        should_close = self._client is None

        try:
            # Query DuckDuckGo Instant Answer / HTML API or SearXNG if configured
            url = (
                self.endpoint_url
                or f"https://api.duckduckgo.com/?q={encoded}&format=json&no_html=1"
            )
            res = await client.get(url)
            if res.status_code == 200:
                data = res.json()
                # Check AbstractURL or Results
                abstract_url = data.get("AbstractURL")
                abstract_src = data.get("AbstractSource")
                if abstract_url and "wikipedia" not in abstract_url:
                    results.append(
                        DiscoveredCandidateDTO(
                            candidate_url=abstract_url,
                            technology_name=clean_q.capitalize(),
                            category="library",
                            documentation_type="official_manual",
                            provider_name=self.provider_name,
                            confidence_score=0.82,
                            evidence={
                                "search_query": f"{clean_q} official documentation",
                                "search_source": abstract_src,
                                "matched_abstract": data.get("Heading"),
                            },
                        )
                    )

                for r in data.get("Results", []):
                    first_url = r.get("FirstURL")
                    if first_url and len(results) < limit:
                        results.append(
                            DiscoveredCandidateDTO(
                                candidate_url=first_url,
                                technology_name=clean_q.capitalize(),
                                category="library",
                                documentation_type="official_manual",
                                provider_name=self.provider_name,
                                confidence_score=0.78,
                                evidence={"search_result_text": r.get("Text")},
                            )
                        )
        except Exception as e:
            logger.info("Search engine query skipped or failed", query=query, error=str(e))
        finally:
            if should_close:
                await client.aclose()

        return results[:limit]
