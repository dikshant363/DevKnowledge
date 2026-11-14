from apps.api.app.discovery.providers.base import DiscoveredCandidateDTO
from apps.api.app.discovery.verification import OfficialSourceVerifier


def test_official_source_verification_high_confidence():
    cand = DiscoveredCandidateDTO(
        candidate_url="https://docs.rs/tokio/latest/tokio/",
        technology_name="Tokio",
        category="library",
        documentation_type="api_reference",
        provider_name="package_registries",
        confidence_score=0.95,
        license_info="MIT",
        evidence={
            "official_manifest": True,
            "registry": "crates.io",
            "stars": 25000,
        },
    )

    # Multi-provider cross validation (surfaced by package_registries AND github_api)
    result = OfficialSourceVerifier.evaluate(
        candidate=cand,
        co_providers=["package_registries", "github_api"],
    )

    assert result["classification"] == "verified_official"
    assert result["confidence_score"] >= 0.85
    assert result["verification_status"] == "auto_registered"
    assert len(result["evidence"]["signals"]) >= 3


def test_unverified_source_never_labelled_official():
    # Low confidence candidate with zero official signals
    cand = DiscoveredCandidateDTO(
        candidate_url="https://random-docs-mirror.xyz/python",
        technology_name="Python Mirror",
        category="library",
        documentation_type="api_reference",
        provider_name="search_engine",
        confidence_score=0.30,
        evidence={},
    )

    result = OfficialSourceVerifier.evaluate(candidate=cand)
    assert result["classification"] != "verified_official"
    assert result["classification"] in ("unverified", "third_party")
    assert result["verification_status"] == "pending_review"


def test_rejected_blacklisted_domain():
    cand = DiscoveredCandidateDTO(
        candidate_url="https://fake-docs.malicious-site.net/api",
        technology_name="Malicious Docs",
        category="library",
        documentation_type="api_reference",
        provider_name="search_engine",
        confidence_score=0.50,
        evidence={},
    )

    result = OfficialSourceVerifier.evaluate(
        candidate=cand,
        rejected_domains=["malicious-site.net"],
    )

    assert result["classification"] == "rejected"
    assert result["verification_status"] == "rejected"
    assert "blacklisted" in result["rejection_reason"].lower()
