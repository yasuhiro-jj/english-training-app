from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ConversationLog(BaseModel):
    """会話ログのデータモデル"""
    topic: str
    date: datetime
    article_url: str
    full_transcript: str
    duration_seconds: int


class FeedbackItem(BaseModel):
    """フィードバック項目のデータモデル"""
    original_sentence: str
    corrected_sentence: str
    category: str  # Grammar, Vocabulary, Expression, Pronunciation
    reason: str
    status: str = "New"  # New, Reviewed
    session_id: str


class SessionCreate(BaseModel):
    """セッション作成リクエスト"""
    article_url: Optional[str] = None
    topic: Optional[str] = None
    custom_content: Optional[str] = None
    custom_title: Optional[str] = None
    custom_question: Optional[str] = None
    custom_lesson_data: Optional[dict] = None # Stores full JSON structure



class SessionResponse(BaseModel):
    """セッション作成レスポンス"""
    session_id: str
    question: str
    article_summary: str


class TranscriptSubmit(BaseModel):
    """音声テキスト送信"""
    session_id: str
    transcript: str
    duration_seconds: int


class AnalysisResponse(BaseModel):
    """解析結果レスポンス"""
    session_id: str
    feedback_count: int
    feedback_items: list[dict] = [] # List of feedback details
    message: str


class VocabularyItem(BaseModel):
    word: str
    pronunciation: str
    type: str  # (v.), (n.), etc.
    definition: str
    example: str

class LessonOption(BaseModel):
    title: str
    date: str
    category: str
    vocabulary: list[VocabularyItem]
    content: str
    discussion_a: list[str]
    discussion_b: list[str]
    question: str # Main question for session start compatibility
    level: str
    japanese_title: str = ""  # Optional, added by backend after generation

class LessonGenerateRequest(BaseModel):
    """レッスン生成リクエスト（URL指定版）"""
    news_url: str

class LessonGenerateResponse(BaseModel):
    lessons: list[LessonOption]

