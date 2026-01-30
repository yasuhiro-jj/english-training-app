from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict
from app.services.ai_service import AIService
from app.deps import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])
ai_service = AIService()

class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = []

@router.post("")
async def chat(request: ChatRequest, user: dict = Depends(get_current_user)):
    """AIとの自由対話エンドポイント"""
    try:
        print(f"Chat request from {user.get('email')}: {request.message[:50]}...")
        response = await ai_service.chat_response(request.message, request.history)
        print(f"Chat response generated successfully ({len(response)} chars)")
        return {"response": response}
    except Exception as e:
        print(f"CHAT ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))
