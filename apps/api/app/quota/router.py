from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.auth.security import get_current_user_and_org
from apps.api.app.database.session import get_db
from apps.api.app.quota.tracker import FreeTierQuotaTracker

router = APIRouter(prefix="/quota", tags=["Free-Tier Quota & Safeguards"])


@router.get("/status")
async def get_quota_status(
    user_org=Depends(get_current_user_and_org),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns current usage across Neon PostgreSQL, Cloudflare R2,
    Cloudflare Workers, and GitHub Actions with zero-cost safeguard flags.
    """
    return await FreeTierQuotaTracker.get_quota_report(db)


@router.post("/pause")
async def pause_work_manually(
    user_org=Depends(get_current_user_and_org),
):
    """
    Manually pauses background crawler and synchronizer execution.
    """
    FreeTierQuotaTracker.set_manual_pause(True)
    return {"message": "Background work execution gracefully paused", "paused": True}


@router.post("/resume")
async def resume_work_manually(
    user_org=Depends(get_current_user_and_org),
):
    """
    Resumes background crawler and synchronizer execution.
    """
    FreeTierQuotaTracker.set_manual_pause(False)
    return {"message": "Background work execution resumed", "paused": False}
