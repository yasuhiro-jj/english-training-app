from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import WhisperTranscribeRequest, WhisperTranscribeResponse
from app.services.whisper_service import WhisperService
from app.services.usage_service import UsageService
from app.deps import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/whisper", tags=["whisper"])

whisper_service = WhisperService()
usage_service = UsageService()


@router.post("/transcribe", response_model=WhisperTranscribeResponse)
async def transcribe_audio(
    request: WhisperTranscribeRequest,
    user: dict = Depends(get_current_user)
):
    """
    音声をWhisper APIで文字起こし
    - 登録後7日間の体験期間・有料プラン: 無制限
    - 体験終了後で有料プランなし: 使用不可
    """
    user_email = user.get("email")
    
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not found")
    
    try:
        # 1. 使用可能かチェック
        requested_minutes = request.duration_seconds / 60.0
        check_result = await usage_service.can_use_whisper(user_email, requested_minutes)
        
        if not check_result["allowed"]:
            error_detail = check_result["reason"]
            if check_result["remaining_minutes"] is not None:
                error_detail += f" (残り: {check_result['remaining_minutes']:.1f}分)"
            raise HTTPException(
                status_code=403,
                detail=error_detail
            )
        
        # 2. サブスクリプション状態を取得
        subscription = await usage_service.get_user_subscription_status(user_email)
        is_trial = subscription["is_trial"]
        
        # 3. Whisper API呼び出し
        result = await whisper_service.transcribe_audio_with_duration(
            audio_base64=request.audio_data,
            duration_seconds=request.duration_seconds,
            user_email=user_email,
            is_trial=is_trial
        )
        
        # 4. 使用量を記録
        await usage_service.add_whisper_usage(user_email, result["usage_minutes"])
        
        # 5. 体験期間中・有料プランともに、音声認識の時間制限はなし
        result["remaining_minutes"] = None

        # 6. レスポンス返却
        return WhisperTranscribeResponse(
            transcript=result["transcript"],
            duration_seconds=result["duration_seconds"],
            usage_minutes=result["usage_minutes"],
            remaining_minutes=result["remaining_minutes"]
        )
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Whisper transcription error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in transcribe_audio: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
