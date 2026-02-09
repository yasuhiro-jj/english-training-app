from fastapi import APIRouter, HTTPException, Depends
from app.services.notion_service import NotionService
from app.services.usage_service import UsageService
from app.deps import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
notion_service = NotionService()
usage_service = UsageService()

@router.get("/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    """ダッシュボード用の統計データを取得"""
    email = user.get("email")
    try:
        stats = notion_service.get_user_stats(email)
        mistakes = notion_service.get_frequent_mistakes(email)
        recent_feedback = notion_service.get_recent_feedback(email, limit=5)
        
        # 体験期間情報を取得
        subscription = await usage_service.get_user_subscription_status(email)
        trial_info = {
            "is_trial": subscription.get("is_trial", False),
            "trial_ends_at": subscription.get("trial_ends_at").isoformat() if subscription.get("trial_ends_at") else None,
            "status": subscription.get("status", "trial"),
            "plan": subscription.get("plan", "free")
        }
        
        return {
            "summary": stats,
            "mistake_trends": mistakes,
            "recent_feedback": recent_feedback,
            "subscription": trial_info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
