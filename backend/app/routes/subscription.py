import logging

from fastapi import APIRouter, Depends

from app.deps import get_current_user
from app.services.usage_service import UsageService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/subscription", tags=["subscription"])
usage_service = UsageService()


@router.get("/me")
async def get_my_subscription(user: dict = Depends(get_current_user)):
    """
    ログイン中ユーザーの現在のプランと状態（プラン画面の「現在のプラン」表示用）。
    ダッシュボードのAPIより軽く、統計の取得を伴わない。
    """
    sub = await usage_service.get_user_subscription_status(user["email"])
    trial_ends_at = sub.get("trial_ends_at")
    return {
        "plan": sub.get("plan", "free"),          # free | basic | premium
        "status": sub.get("status", "trial"),     # trial | active | expired | cancelled
        "is_trial": bool(sub.get("is_trial", False)),
        "trial_ends_at": trial_ends_at.isoformat() if trial_ends_at else None,
    }
