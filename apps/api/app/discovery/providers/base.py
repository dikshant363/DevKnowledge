from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.database.models import DiscoveryEvent, DiscoveryProviderConfig

logger = structlog.get_logger()


@dataclass
class DiscoveredCandidateDTO:
    candidate_url: str
    technology_name: str
    category: str
    documentation_type: str
    provider_name: str
    confidence_score: float
    evidence: Dict[str, Any] = field(default_factory=dict)
    license_info: Optional[str] = None
    canonical_domain: str = ""

    def __post_init__(self):
        if not self.canonical_domain and self.candidate_url:
            parsed = urlparse(self.candidate_url)
            self.canonical_domain = parsed.netloc.lower()


class DiscoveryProvider(ABC):
    """
    Abstract Base Class for all documentation discovery providers.
    Enforces daily quota accounting, safe rate limits, and standard output DTOs.
    """

    provider_name: str
    display_name: str
    default_quota_limit: int = 500

    @abstractmethod
    async def discover(self, query: str, limit: int = 10) -> List[DiscoveredCandidateDTO]:
        """Execute discovery search or registry query."""
        pass

    async def check_and_increment_quota(self, db: AsyncSession, cost: int = 1) -> bool:
        """
        Ensures provider has not exceeded its daily request budget.
        """
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        res = await db.execute(
            select(DiscoveryProviderConfig).where(
                DiscoveryProviderConfig.provider_name == self.provider_name
            )
        )
        config = res.scalar_one_or_none()
        if not config:
            config = DiscoveryProviderConfig(
                provider_name=self.provider_name,
                display_name=self.display_name,
                is_enabled=True,
                quota_limit_daily=self.default_quota_limit,
                requests_today=0,
                last_reset_day=today,
                configuration={},
            )
            db.add(config)
            await db.flush()

        if not config.is_enabled:
            logger.info("Discovery provider disabled in configuration", provider=self.provider_name)
            return False

        if config.last_reset_day != today:
            config.requests_today = 0
            config.last_reset_day = today

        if config.requests_today + cost > config.quota_limit_daily:
            logger.warning(
                "Discovery provider exceeded daily quota limit",
                provider=self.provider_name,
                used=config.requests_today,
                limit=config.quota_limit_daily,
            )
            # Emit quota event
            db.add(
                DiscoveryEvent(
                    event_type="quota_exceeded",
                    provider_name=self.provider_name,
                    details={"used": config.requests_today, "limit": config.quota_limit_daily},
                )
            )
            await db.commit()
            return False

        config.requests_today += cost
        await db.commit()
        return True
