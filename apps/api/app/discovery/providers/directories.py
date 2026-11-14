from typing import Dict, List

import structlog

from apps.api.app.discovery.providers.base import DiscoveredCandidateDTO, DiscoveryProvider

logger = structlog.get_logger()

# Authoritative project mapping from official foundations and consortia
FOUNDATION_DIRECTORY: Dict[str, Dict[str, str]] = {
    "kubernetes": {
        "name": "Kubernetes",
        "url": "https://kubernetes.io/docs/",
        "category": "cloud_service",
        "foundation": "CNCF",
        "license": "Apache-2.0",
        "doc_type": "official_manual",
    },
    "prometheus": {
        "name": "Prometheus",
        "url": "https://prometheus.io/docs/",
        "category": "developer_tool",
        "foundation": "CNCF",
        "license": "Apache-2.0",
        "doc_type": "official_manual",
    },
    "envoy": {
        "name": "Envoy",
        "url": "https://www.envoyproxy.io/docs/envoy/latest/",
        "category": "networking",
        "foundation": "CNCF",
        "license": "Apache-2.0",
        "doc_type": "api_reference",
    },
    "spark": {
        "name": "Apache Spark",
        "url": "https://spark.apache.org/docs/latest/",
        "category": "database",
        "foundation": "Apache Software Foundation",
        "license": "Apache-2.0",
        "doc_type": "api_reference",
    },
    "kafka": {
        "name": "Apache Kafka",
        "url": "https://kafka.apache.org/documentation/",
        "category": "cloud_service",
        "foundation": "Apache Software Foundation",
        "license": "Apache-2.0",
        "doc_type": "official_manual",
    },
    "opentelemetry": {
        "name": "OpenTelemetry",
        "url": "https://opentelemetry.io/docs/",
        "category": "developer_tool",
        "foundation": "CNCF",
        "license": "Apache-2.0",
        "doc_type": "specification",
    },
    "linux": {
        "name": "Linux Kernel",
        "url": "https://docs.kernel.org",
        "category": "operating_system",
        "foundation": "Linux Foundation",
        "license": "GPL-2.0",
        "doc_type": "specification",
    },
}


class OfficialDirectoryProvider(DiscoveryProvider):
    """
    Discovers technologies cataloged in official non-profit foundations:
    - Cloud Native Computing Foundation (CNCF)
    - Apache Software Foundation (ASF)
    - Linux Foundation
    """

    provider_name = "official_directory"
    display_name = "Official Foundation Directories (CNCF, Apache, Linux)"
    default_quota_limit = 2000

    async def discover(self, query: str, limit: int = 10) -> List[DiscoveredCandidateDTO]:
        results: List[DiscoveredCandidateDTO] = []
        clean_q = query.strip().lower()

        for key, entry in FOUNDATION_DIRECTORY.items():
            if clean_q in key or key in clean_q or clean_q in entry["name"].lower():
                results.append(
                    DiscoveredCandidateDTO(
                        candidate_url=entry["url"],
                        technology_name=entry["name"],
                        category=entry["category"],
                        documentation_type=entry["doc_type"],
                        provider_name=self.provider_name,
                        confidence_score=0.98,  # Highly authoritative foundation directory
                        license_info=entry["license"],
                        evidence={
                            "foundation": entry["foundation"],
                            "foundation_vetted": True,
                            "official_url": entry["url"],
                        },
                    )
                )

        return results[:limit]
