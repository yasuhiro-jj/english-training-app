from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.feedback_service import NotionFeedbackService
import logging
import os

router = APIRouter(prefix="/api/feedback", tags=["feedback"])
feedback_service = NotionFeedbackService()
logger = logging.getLogger(__name__)


class FeedbackRequest(BaseModel):
    content: str
    email: Optional[str] = None
    name: Optional[str] = None


@router.post("")
async def submit_feedback(request: FeedbackRequest):
    """
    ユーザーからのフィードバックを受け取り、Notionに保存する
    """
    if not request.content or len(request.content.strip()) == 0:
        raise HTTPException(status_code=400, detail="フィードバック内容を入力してください")

    success = await feedback_service.create_feedback(
        feedback_content=request.content,
        user_email=request.email,
        user_name=request.name
    )

    if success:
        return {"message": "フィードバックを送信しました。ありがとうございます！"}
    else:
        reason = feedback_service.last_error or "unknown"
        logger.error(f"Feedback submission failed: {reason}")
        # 開発時は原因が分かるように返す（本番では環境変数で無効化）
        if os.getenv("FEEDBACK_DEBUG", "1") == "1":
            raise HTTPException(status_code=500, detail=f"フィードバックの送信に失敗しました（{reason}）")
        raise HTTPException(status_code=500, detail="フィードバックの送信に失敗しました")


@router.get("/diagnose")
async def diagnose_feedback_notion():
    """
    Notion連携の疎通確認（DB取得とTitleプロパティ検出）
    """
    ok = feedback_service._ensure_db_schema_cached()
    return {
        "ok": ok,
        "notion_token_configured": bool(os.getenv("NOTION_TOKEN")),
        "notion_feedback_database_id_configured": bool(os.getenv("NOTION_FEEDBACK_DATABASE_ID")),
        "title_property": getattr(feedback_service, "_title_property_name", None),
        "email_property": getattr(feedback_service, "_email_property_name", None),
        "status_property": getattr(feedback_service, "_status_property_name", None),
        "last_error": feedback_service.last_error,
    }
