import os
from typing import List, Optional

import httpx
import structlog

from apps.api.app.discovery.providers.base import DiscoveredCandidateDTO, DiscoveryProvider

logger = structlog.get_logger()


class GitHubDiscoveryProvider(DiscoveryProvider):
    """
    Discovers documentation websites via GitHub Repository metadata and topic searches.
    """

    provider_name = "github_api"
    display_name = "GitHub Organization & Repository API"
    default_quota_limit = 500

    def __init__(self, client: Optional[httpx.AsyncClient] = None, token: Optional[str] = None):
        self._client = client
        self.token = token or os.getenv("GITHUB_TOKEN")

    async def discover(self, query: str, limit: int = 10) -> List[DiscoveredCandidateDTO]:
        results: List[DiscoveredCandidateDTO] = []
        clean_q = query.strip()

        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "DevKnowledge-Discovery/1.0",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        client = self._client or httpx.AsyncClient(timeout=10.0, headers=headers)
        should_close = self._client is None

        try:
            # Search repositories by query
            url = f"https://api.github.com/search/repositories?q={clean_q}+in:name&sort=stars&order=desc&per_page=5"
            res = await client.get(url)
            if res.status_code == 200:
                items = res.json().get("items", [])
                for repo in items:
                    homepage = repo.get("homepage")
                    stars = repo.get("stargazers_count", 0)
                    repo_url = repo.get("html_url")
                    doc_url = (
                        homepage
                        if homepage and homepage.startswith("http")
                        else f"{repo_url}#readme"
                    )

                    # Calculate confidence based on repository popularity and official signals
                    is_high_star = stars >= 1000
                    conf = 0.88 if homepage and is_high_star else 0.70

                    results.append(
                        DiscoveredCandidateDTO(
                            candidate_url=doc_url,
                            technology_name=repo.get("name", query),
                            category="framework"
                            if "framework" in repo.get("topics", [])
                            else "library",
                            documentation_type="api_reference" if homepage else "repository_readme",
                            provider_name=self.provider_name,
                            confidence_score=conf,
                            license_info=repo.get("license", {}).get("spdx_id")
                            if repo.get("license")
                            else None,
                            evidence={
                                "github_repo": repo.get("full_name"),
                                "stars": stars,
                                "homepage": homepage,
                                "topics": repo.get("topics", []),
                                "is_fork": repo.get("fork", False),
                            },
                        )
                    )
        except Exception as e:
            logger.warning("GitHub repository discovery search failed", query=query, error=str(e))
        finally:
            if should_close:
                await client.aclose()

        return results[:limit]
