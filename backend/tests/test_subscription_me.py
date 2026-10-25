import os
import sys
from datetime import datetime, timezone
from unittest.mock import AsyncMock

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault("JWT_SECRET_KEY", "test-secret")

from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.deps import get_current_user  # noqa: E402
import app.routes.subscription as sub  # noqa: E402


def client():
    app = FastAPI()
    app.include_router(sub.router)
    app.dependency_overrides[get_current_user] = lambda: {"email": "a@example.com"}
    return TestClient(app)


def test_requires_auth():
    app = FastAPI()
    app.include_router(sub.router)
    assert TestClient(app).get("/api/subscription/me").status_code == 401


def test_returns_paid_plan(monkeypatch):
    monkeypatch.setattr(sub.usage_service, "get_user_subscription_status",
                        AsyncMock(return_value={"plan": "basic", "status": "active", "trial_ends_at": None, "is_trial": False}))
    r = client().get("/api/subscription/me")
    assert r.status_code == 200
    assert r.json() == {"plan": "basic", "status": "active", "is_trial": False, "trial_ends_at": None}


def test_serializes_trial_end(monkeypatch):
    end = datetime(2026, 11, 1, tzinfo=timezone.utc)
    monkeypatch.setattr(sub.usage_service, "get_user_subscription_status",
                        AsyncMock(return_value={"plan": "free", "status": "trial", "trial_ends_at": end, "is_trial": True}))
    j = client().get("/api/subscription/me").json()
    assert j["is_trial"] is True and j["trial_ends_at"].startswith("2026-11-01")
