import pytest

from apps.api.app.database.models import Base
from apps.api.app.database.session import AsyncSessionLocal, engine
from apps.api.app.quota.tracker import FreeTierQuotaTracker, QuotaLimitExceededError


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest.mark.asyncio
async def test_quota_tracker_report():
    async with AsyncSessionLocal() as db:
        # Reset manual pause
        FreeTierQuotaTracker.set_manual_pause(False)

        report = await FreeTierQuotaTracker.get_quota_report(db)
        assert report["graceful_pause_active"] is False
        assert "neon_database" in report["quotas"]
        assert "cloudflare_r2" in report["quotas"]
        assert "cloudflare_workers_requests" in report["quotas"]
        assert "github_actions_minutes" in report["quotas"]
        assert report["quotas"]["neon_database"]["limit_mb"] == 500
        assert report["quotas"]["cloudflare_r2"]["limit_gb"] == 10
        assert "₹0/month" in report["operating_cost_target"]


@pytest.mark.asyncio
async def test_quota_manual_pause_prevents_enqueuing():
    async with AsyncSessionLocal() as db:
        FreeTierQuotaTracker.set_manual_pause(True)

        with pytest.raises(QuotaLimitExceededError) as exc_info:
            await FreeTierQuotaTracker.assert_can_enqueue_job(db)

        assert "gracefully paused" in str(exc_info.value)

        # Resume
        FreeTierQuotaTracker.set_manual_pause(False)
        # Should now pass without error
        await FreeTierQuotaTracker.assert_can_enqueue_job(db)
