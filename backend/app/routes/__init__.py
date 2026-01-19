"""
Routes package initialization
"""
from .session import router as session_router
from .auth import router as auth_router
from .chat import router as chat_router
from .dashboard import router as dashboard_router

__all__ = ["session_router", "auth_router", "chat_router", "dashboard_router"]
