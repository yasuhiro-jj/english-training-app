from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict
from app.services.ai_service import AIService
from app.services.usage_service import UsageService
from app.deps import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])
ai_service = AIService()
usage_service = UsageService()

class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = []

@router.post("")
async def chat(request: ChatRequest, user: dict = Depends(get_current_user)):
    """
    AIとの自由対話エンドポイント
    無料体験プランでは1日10メッセージまで
    """
    user_email = user.get("email") if user else None
    if not user_email:
        raise HTTPException(status_code=401, detail="認証が必要です")
    
    # 使用制限チェック
    check_result = await usage_service.can_use_ai_chat(user_email)
    if not check_result["allowed"]:
        raise HTTPException(
            status_code=403,
            detail=check_result["reason"]
        )
    
    try:
        print(f"Chat request from {user_email}: {request.message[:50]}...")
        response = await ai_service.chat_response(request.message, request.history)
        print(f"Chat response generated successfully ({len(response)} chars)")
        
        # 使用量を記録（無料体験の場合）
        await usage_service.add_ai_chat_usage(user_email)
        
        # 残りメッセージ数を返す
        remaining = check_result.get("remaining_messages")
        result = {"response": response}
        if remaining is not None:
            result["remaining_messages"] = remaining - 1  # 今回使用した分を引く
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"CHAT ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))
