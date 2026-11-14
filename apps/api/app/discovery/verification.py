from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import structlog

from apps.api.app.discovery.providers.base import DiscoveredCandidateDTO

logger = structlog.get_logger()

# Trusted top-level and platform documentation domains
TRUSTED_AUTHORITATIVE_DOMAINS = {
    "docs.rs",
    "python.org",
    "docs.python.org",
    "rust-lang.org",
    "doc.rust-lang.org",
    "developer.apple.com",
    "developer.android.com",
    "go.dev",
    "pkg.go.dev",
    "nodejs.org",
    "react.dev",
    "kubernetes.io",
    "apache.org",
    "kernel.org",
}

COMMUNITY_INDICATORS = [
    "medium.com",
    "dev.to",
    "hashnode.dev",
    "tutorialspoint.com",
    "geeksforgeeks.org",
    "w3schools.com",
    "freecodecamp.org",
    "blogspot.com",
    "wordpress.com",
]


class OfficialSourceVerifier:
    """
    Evaluates independent multi-signal evidence to classify discovered candidates
    without blindly trusting website claims.
    """

    @classmethod
    def evaluate(
        cls,
        candidate: DiscoveredCandidateDTO,
        co_providers: Optional[List[str]] = None,
        rejected_domains: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Computes composite confidence score and determines official status.
        """
        domain = candidate.canonical_domain.lower()
        evidence_signals: List[Dict[str, Any]] = []
        score = 0.0

        # Check domain blacklist
        if rejected_domains:
            for b in rejected_domains:
                if domain == b.lower() or domain.endswith(f".{b.lower()}"):
                    return {
                        "confidence_score": 0.0,
                        "classification": "rejected",
                        "verification_status": "rejected",
                        "rejection_reason": f"Domain is blacklisted: {b}",
                        "evidence": {"signals": [{"type": "blacklist_match", "domain": domain}]},
                    }

        # Check community / blog platforms
        is_community_host = any(c in domain for c in COMMUNITY_INDICATORS)
        if is_community_host:
            evidence_signals.append(
                {"type": "community_blog_host", "domain": domain, "weight": -0.4}
            )
            return {
                "confidence_score": 0.40,
                "classification": "third_party",
                "verification_status": "pending_review",
                "evidence": {
                    "signals": evidence_signals,
                    "reason": "Third-party tutorial or blog host",
                },
            }

        # Signal 1: Official Foundation Directory (CNCF, Apache, Linux)
        if candidate.evidence.get("foundation_vetted"):
            score += 0.45
            evidence_signals.append(
                {
                    "type": "official_foundation_directory",
                    "foundation": candidate.evidence.get("foundation"),
                    "weight": 0.45,
                }
            )

        # Signal 2: Authoritative Package Registry Manifest
        if candidate.evidence.get("official_manifest"):
            score += 0.35
            evidence_signals.append(
                {
                    "type": "package_registry_manifest",
                    "registry": candidate.evidence.get("registry"),
                    "weight": 0.35,
                }
            )

        # Signal 3: GitHub Official Signals (Stars & Official Org)
        stars = candidate.evidence.get("stars", 0)
        if stars >= 500:
            star_weight = 0.20 if stars >= 2000 else 0.12
            score += star_weight
            evidence_signals.append(
                {
                    "type": "github_stars_authority",
                    "stars": stars,
                    "weight": star_weight,
                }
            )

        # Signal 4: Trusted Authoritative Domain
        if any(domain == d or domain.endswith(f".{d}") for d in TRUSTED_AUTHORITATIVE_DOMAINS):
            score += 0.25
            evidence_signals.append(
                {
                    "type": "trusted_authoritative_domain",
                    "domain": domain,
                    "weight": 0.25,
                }
            )

        # Signal 5: Multi-Provider Cross-Validation (surfaced by >= 2 independent providers)
        all_providers = set([candidate.provider_name] + (co_providers or []))
        if len(all_providers) >= 2:
            score += 0.20
            evidence_signals.append(
                {
                    "type": "multi_provider_cross_validation",
                    "providers": list(all_providers),
                    "weight": 0.20,
                }
            )

        # Signal 6: License Metadata
        if candidate.license_info:
            score += 0.05
            evidence_signals.append(
                {
                    "type": "spdx_license_detected",
                    "license": candidate.license_info,
                    "weight": 0.05,
                }
            )

        # Signal 7: Canonical Documentation Path Structure
        parsed = urlparse(candidate.candidate_url)
        if any(
            kw in parsed.path.lower() for kw in ["/docs", "/api", "/reference", "/guide", "/en/"]
        ):
            score += 0.08
            evidence_signals.append(
                {
                    "type": "canonical_doc_path_structure",
                    "path": parsed.path,
                    "weight": 0.08,
                }
            )

        # Final clamped score
        final_score = round(min(1.0, max(0.0, score)), 2)

        # Classification determination:
        # Verified Official requires: confidence >= 0.85 AND at least 2 verified signals
        if final_score >= 0.85 and len(evidence_signals) >= 2:
            classification = "verified_official"
            status = "auto_registered"
        elif final_score >= 0.65:
            classification = "likely_official"
            status = "pending_review"
        elif candidate.evidence.get("is_community"):
            classification = "community_maintained"
            status = "pending_review"
        else:
            classification = "unverified"
            status = "pending_review"

        return {
            "confidence_score": final_score,
            "classification": classification,
            "verification_status": status,
            "evidence": {
                "signals": evidence_signals,
                "score": final_score,
                "providers_involved": list(all_providers),
            },
        }
