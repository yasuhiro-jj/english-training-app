from openai import AsyncOpenAI
import os
import base64
import io
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class WhisperService:
    """OpenAI Whisper API統合サービス"""
    
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning("OPENAI_API_KEY not configured, WhisperService will not work")
            self.client = None
        else:
            self.client = AsyncOpenAI(api_key=api_key)
    
    async def transcribe_audio(
        self,
        audio_base64: str,
        user_email: str,
        is_trial: bool = False
    ) -> Dict:
        """
        音声をWhisper APIで文字起こし
        
        Args:
            audio_base64: base64エンコードされた音声データ
            user_email: ユーザーのメールアドレス
            is_trial: 無料体験中かどうか
        
        Returns:
            {
                "transcript": str,
                "duration_seconds": float,
                "usage_minutes": float,
                "remaining_minutes": Optional[float]
            }
        """
        if not self.client:
            raise ValueError("OpenAI API key not configured")
        
        try:
            # 1. base64デコード
            audio_bytes = base64.b64decode(audio_base64)
            audio_file = io.BytesIO(audio_bytes)
            audio_file.name = "recording.webm"  # または .m4a, .mp3
            
            # 2. Whisper API呼び出し
            logger.info(f"Calling Whisper API for user: {user_email}")
            response = await self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="en"  # 英語に固定
            )
            
            transcript = response.text
            
            # Whisper APIはdurationを返さないため、リクエストのduration_secondsを使用
            # 実際の音声長はクライアント側で測定した値を使用
            # 将来的に音声ファイルから直接取得することも可能
            
            # 3. 使用分数計算（リクエストのduration_secondsを使用）
            # 注意: 実際の音声長はクライアント側で測定した値を使用
            # duration_secondsはリクエストから取得する必要があるため、
            # このメソッドの引数に追加する必要がある
            # 暫定的に、transcriptの長さから推定（正確ではない）
            # 実際の実装では、リクエストのduration_secondsを使用
            
            return {
                "transcript": transcript,
                "duration_seconds": 0.0,  # 実際の値は呼び出し元から取得
                "usage_minutes": 0.0,  # 実際の値は呼び出し元で計算
                "remaining_minutes": None  # UsageServiceで計算
            }
        except Exception as e:
            logger.error(f"Whisper transcription error: {e}")
            raise ValueError(f"Whisper transcription failed: {str(e)}")
    
    async def transcribe_audio_with_duration(
        self,
        audio_base64: str,
        duration_seconds: float,
        user_email: str,
        is_trial: bool = False
    ) -> Dict:
        """
        音声をWhisper APIで文字起こし（duration指定版）
        
        Args:
            audio_base64: base64エンコードされた音声データ
            duration_seconds: 音声の長さ（秒）
            user_email: ユーザーのメールアドレス
            is_trial: 無料体験中かどうか
        
        Returns:
            {
                "transcript": str,
                "duration_seconds": float,
                "usage_minutes": float,
                "remaining_minutes": Optional[float]
            }
        """
        if not self.client:
            raise ValueError("OpenAI API key not configured")
        
        try:
            # 1. base64デコード
            audio_bytes = base64.b64decode(audio_base64)
            audio_file = io.BytesIO(audio_bytes)
            
            # ファイル拡張子を推測（WebMが一般的）
            audio_file.name = "recording.webm"
            
            # 2. Whisper API呼び出し
            logger.info(f"Calling Whisper API for user: {user_email}, duration: {duration_seconds}s")
            response = await self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="en"  # 英語に固定
            )
            
            transcript = response.text
            
            # 3. 使用分数計算
            usage_minutes = duration_seconds / 60.0
            
            logger.info(f"Whisper transcription successful: {len(transcript)} chars, {usage_minutes:.2f} minutes")
            
            return {
                "transcript": transcript,
                "duration_seconds": duration_seconds,
                "usage_minutes": usage_minutes,
                "remaining_minutes": None  # UsageServiceで計算
            }
        except Exception as e:
            logger.error(f"Whisper transcription error: {e}")
            raise ValueError(f"Whisper transcription failed: {str(e)}")
