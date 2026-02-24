from fastapi import APIRouter, Depends, HTTPException, Response
from app.deps import get_current_user
from app.models.schemas import TtsSpeakRequest
from app.services.tts_service import TtsService
from app.services.usage_service import UsageService


router = APIRouter(prefix="/api/tts", tags=["tts"])

tts_service = TtsService()
usage_service = UsageService()


@router.post("/speak")
async def speak(request: TtsSpeakRequest, user: dict = Depends(get_current_user)):
    """
    高品質 Read Aloud 用のTTS（mp3）を返す。
    - 認証必須
    - 体験期間終了 & 無料のユーザーは利用不可（自動課金は一切発生しません）
    """
    user_email = (user or {}).get("email")
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not found")

    text = (request.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    # Abuse防止: 1リクエストの文字数上限（フロント側はチャンク送信）
    if len(text) > 1500:
        raise HTTPException(status_code=400, detail="text is too long")

    subscription = await usage_service.get_user_subscription_status(user_email)
    if subscription.get("status") == "expired" and subscription.get("plan") == "free":
        raise HTTPException(
            status_code=403,
            detail="体験期間が終了しました。有料プランへのご登録をお願いいたします。自動課金は一切発生しません。",
        )

    try:
        default_instructions = (
            "Speak like a friendly native English narrator. "
            "Use natural rhythm and intonation, not robotic. "
            "Keep it clear and easy to follow for English learners."
        )
        audio_bytes = await tts_service.speak_mp3(
            text,
            voice=request.voice or "alloy",
            model=request.model,
            instructions=(request.instructions or default_instructions),
        )
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={"Cache-Control": "no-store"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

