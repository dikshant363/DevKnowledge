from typing import List, Optional

import httpx
import structlog

from apps.api.app.discovery.providers.base import DiscoveredCandidateDTO, DiscoveryProvider

logger = structlog.get_logger()


class PackageRegistryProvider(DiscoveryProvider):
    """
    Discovers documentation websites directly from authoritative package registries:
    - PyPI (Python)
    - Crates.io (Rust)
    - npm (JavaScript/TypeScript)
    """

    provider_name = "package_registries"
    display_name = "Package Registries (PyPI, Crates.io, npm)"
    default_quota_limit = 1000

    def __init__(self, client: Optional[httpx.AsyncClient] = None):
        self._client = client

    async def discover(self, query: str, limit: int = 10) -> List[DiscoveredCandidateDTO]:
        results: List[DiscoveredCandidateDTO] = []
        clean_q = query.strip().lower()

        client = self._client or httpx.AsyncClient(
            timeout=10.0, headers={"User-Agent": "DevKnowledge-Discovery/1.0"}
        )
        should_close = self._client is None

        try:
            # 1. Check Crates.io (Rust)
            try:
                crates_res = await client.get(f"https://crates.io/api/v1/crates/{clean_q}")
                if crates_res.status_code == 200:
                    data = crates_res.json().get("crate", {})
                    doc_url = data.get("documentation") or f"https://docs.rs/{clean_q}"
                    homepage = data.get("homepage")
                    target_url = doc_url or homepage
                    if target_url:
                        results.append(
                            DiscoveredCandidateDTO(
                                candidate_url=target_url,
                                technology_name=data.get("name", query),
                                category="library",
                                documentation_type="api_reference",
                                provider_name=self.provider_name,
                                confidence_score=0.95,
                                license_info=crates_res.json()
                                .get("versions", [{}])[0]
                                .get("license"),
                                evidence={
                                    "registry": "crates.io",
                                    "downloads": data.get("downloads", 0),
                                    "crate_name": data.get("name"),
                                    "homepage": homepage,
                                    "official_manifest": True,
                                },
                            )
                        )
            except Exception as e:
                logger.debug("Crates.io query failed", query=clean_q, error=str(e))

            # 2. Check PyPI (Python)
            try:
                pypi_res = await client.get(f"https://pypi.org/pypi/{clean_q}/json")
                if pypi_res.status_code == 200:
                    info = pypi_res.json().get("info", {})
                    proj_urls = info.get("project_urls") or {}
                    doc_url = (
                        proj_urls.get("Documentation")
                        or proj_urls.get("Docs")
                        or proj_urls.get("Homepage")
                        or info.get("home_page")
                    )
                    if doc_url:
                        results.append(
                            DiscoveredCandidateDTO(
                                candidate_url=doc_url,
                                technology_name=info.get("name", query),
                                category="library",
                                documentation_type="api_reference",
                                provider_name=self.provider_name,
                                confidence_score=0.92,
                                license_info=info.get("license"),
                                evidence={
                                    "registry": "pypi",
                                    "package_name": info.get("name"),
                                    "author": info.get("author"),
                                    "homepage": info.get("home_page"),
                                    "official_manifest": True,
                                },
                            )
                        )
            except Exception as e:
                logger.debug("PyPI query failed", query=clean_q, error=str(e))

            # 3. Check npm (JavaScript/TypeScript)
            try:
                npm_res = await client.get(f"https://registry.npmjs.org/{clean_q}")
                if npm_res.status_code == 200:
                    data = npm_res.json()
                    homepage = data.get("homepage")
                    latest_ver = data.get("dist-tags", {}).get("latest")
                    license_str = None
                    if latest_ver and latest_ver in data.get("versions", {}):
                        ver_data = data["versions"][latest_ver]
                        license_str = ver_data.get("license")
                        homepage = homepage or ver_data.get("homepage")

                    if homepage:
                        results.append(
                            DiscoveredCandidateDTO(
                                candidate_url=homepage,
                                technology_name=data.get("name", query),
                                category="library",
                                documentation_type="guide",
                                provider_name=self.provider_name,
                                confidence_score=0.90,
                                license_info=license_str,
                                evidence={
                                    "registry": "npm",
                                    "package_name": data.get("name"),
                                    "homepage": homepage,
                                    "official_manifest": True,
                                },
                            )
                        )
            except Exception as e:
                logger.debug("npm query failed", query=clean_q, error=str(e))

        finally:
            if should_close:
                await client.aclose()

        return results[:limit]
