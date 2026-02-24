from openai import AsyncOpenAI
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class TtsService:
    """OpenAI TTS (Text-to-Speech) サービス"""

    _ALLOWED_VOICES = {"alloy", "verse", "nova", "shimmer", "echo", "fable", "onyx"}

    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning("OPENAI_API_KEY not configured, TtsService will not work")
            self.client = None
        else:
            self.client = AsyncOpenAI(api_key=api_key)

    def _require_client(self) -> AsyncOpenAI:
        if self.client is None:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        return self.client

    async def speak_mp3(
        self,
        text: str,
        *,
        voice: str = "alloy",
        model: Optional[str] = None,
    ) -> bytes:
        if not text or not text.strip():
            return b""

        voice_normalized = (voice or "alloy").strip().lower()
        if voice_normalized not in self._ALLOWED_VOICES:
            voice_normalized = "alloy"

        chosen_model = (model or os.getenv("OPENAI_TTS_MODEL") or "tts-1-hd").strip()

        # NOTE: openai==1.10.0 の audio.speech.create はバイナリ応答を返す
        response = await self._require_client().audio.speech.create(
            model=chosen_model,
            voice=voice_normalized,
            input=text,
        )

        audio_bytes = getattr(response, "content", None)
        if isinstance(audio_bytes, (bytes, bytearray)):
            return bytes(audio_bytes)

        # フォールバック（ライブラリ側の返却形が変わった場合）
        try:
            return bytes(response)  # type: ignore[arg-type]
        except Exception as e:
            logger.error(f"TTS response to bytes failed: {e}")
            raise RuntimeError("TTS audio generation failed")

