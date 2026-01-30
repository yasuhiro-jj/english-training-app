from fastapi import APIRouter, HTTPException, Depends
from app.services.notion_service import NotionService
from app.deps import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
notion_service = NotionService()

@router.get("/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    """ダッシュボード用の統計データを取得"""
    email = user.get("email")
    try:
        stats = notion_service.get_user_stats(email)
        mistakes = notion_service.get_frequent_mistakes(email)
        recent_feedback = notion_service.get_recent_feedback(email, limit=5)
        
        return {
            "summary": stats,
            "mistake_trends": mistakes,
            "recent_feedback": recent_feedback
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
