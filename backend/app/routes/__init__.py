"""
Routes package initialization
"""
from .session import router as session_router
from .auth import router as auth_router
from .chat import router as chat_router
from .dashboard import router as dashboard_router
from .lesson import router as lesson_router
from .tts import router as tts_router

__all__ = ["session_router", "auth_router", "chat_router", "dashboard_router", "lesson_router", "tts_router"]
