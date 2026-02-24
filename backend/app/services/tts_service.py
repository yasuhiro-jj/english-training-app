import os
import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)


class TtsService:
    """OpenAI TTS (Text-to-Speech) サービス"""

    _VOICES_ALL = {
        "cedar",
        "marin",
        "verse",
        "shimmer",
        "sage",
        "onyx",
        "nova",
        "fable",
        "echo",
        "coral",
        "ballad",
        "ash",
        "alloy",
    }
    _VOICES_TTS_1 = {"alloy", "ash", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer"}

    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.api_base = (os.getenv("OPENAI_API_BASE") or "https://api.openai.com/v1").rstrip("/")
        if not self.api_key:
            logger.warning("OPENAI_API_KEY not configured, TtsService will not work")
            self.api_key = None

    def _require_api_key(self) -> str:
        if not self.api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        return self.api_key

    def _normalize_voice(self, voice: str, model: str) -> str:
        v = (voice or "").strip().lower()
        chosen_model = (model or "").strip()
        allowed = self._VOICES_TTS_1 if chosen_model in {"tts-1", "tts-1-hd"} else self._VOICES_ALL

        if v in allowed:
            return v

        # modelごとの推奨フォールバック
        if allowed is self._VOICES_TTS_1:
            return "nova"
        return "cedar"

    async def _speech_http(
        self,
        *,
        model: str,
        voice: str,
        text: str,
        instructions: Optional[str],
    ) -> bytes:
        api_key = self._require_api_key()
        url = f"{self.api_base}/audio/speech"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload: dict = {"model": model, "voice": voice, "input": text}
        if instructions:
            payload["instructions"] = instructions

        timeout = httpx.Timeout(30.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code >= 400:
                detail = resp.text
                raise RuntimeError(f"OpenAI TTS failed ({resp.status_code}): {detail[:300]}")
            return resp.content

    async def speak_mp3(
        self,
        text: str,
        *,
        voice: str = "alloy",
        model: Optional[str] = None,
        instructions: Optional[str] = None,
    ) -> bytes:
        if not text or not text.strip():
            return b""

        chosen_model = (model or os.getenv("OPENAI_TTS_MODEL") or "gpt-4o-mini-tts").strip()
        voice_normalized = self._normalize_voice(voice, chosen_model)

        # 音声がより自然になるよう、軽い整形（読み上げに悪影響な連続空白など）
        cleaned = " ".join(text.strip().split())

        try:
            return await self._speech_http(
                model=chosen_model,
                voice=voice_normalized,
                text=cleaned,
                instructions=instructions,
            )
        except Exception as e:
            # 互換フォールバック: 旧TTSモデルへ（voiceも合わせて再正規化）
            logger.warning(f"TTS primary failed, falling back. primary_model={chosen_model} err={e}")
            fallback_model = "tts-1-hd"
            fallback_voice = self._normalize_voice(voice_normalized, fallback_model)
            return await self._speech_http(
                model=fallback_model,
                voice=fallback_voice,
                text=cleaned,
                instructions=None,  # tts-1/hdはinstructions未対応の可能性があるため外す
            )

