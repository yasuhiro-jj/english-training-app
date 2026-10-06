import base64
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault("JWT_SECRET_KEY", "test-secret")
os.environ["GOOGLE_PLAY_RTDN_SECRET"] = "rtdn-secret"
os.environ["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"] = "{}"

from fastapi.testclient import TestClient  # noqa: E402

from app.deps import get_current_user  # noqa: E402
from app.services.google_play_service import (  # noqa: E402
    GooglePlayService,
    PlayPurchaseError,
)
import app.routes.play_billing as pb  # noqa: E402
from fastapi import FastAPI  # noqa: E402


def sub(state, product="deepspeak_basic_monthly", days=30, ack="ACKNOWLEDGEMENT_STATE_PENDING"):
    expiry = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
    return {
        "subscriptionState": state,
        "acknowledgementState": ack,
        "lineItems": [{"productId": product, "expiryTime": expiry}],
    }


@pytest.fixture
def svc():
    return GooglePlayService()


@pytest.mark.parametrize(
    "state,days,expected",
    [
        ("SUBSCRIPTION_STATE_ACTIVE", 30, ("Basic", "Active")),
        ("SUBSCRIPTION_STATE_IN_GRACE_PERIOD", 3, ("Basic", "Active")),
        ("SUBSCRIPTION_STATE_CANCELED", 10, ("Basic", "Active")),
        ("SUBSCRIPTION_STATE_CANCELED", -1, ("Free", "Cancelled")),
        ("SUBSCRIPTION_STATE_ON_HOLD", -1, ("Basic", "Expired")),
        ("SUBSCRIPTION_STATE_PAUSED", 5, ("Basic", "Expired")),
        ("SUBSCRIPTION_STATE_EXPIRED", -1, ("Free", "Cancelled")),
    ],
)
def test_map_state(svc, state, days, expected):
    assert svc.map_state(sub(state, days=days)) == expected


def test_map_state_premium_yearly(svc):
    s = sub("SUBSCRIPTION_STATE_ACTIVE", product="deepspeak_premium_yearly")
    assert svc.map_state(s) == ("Premium", "Active")


def test_pending_grants_nothing(svc):
    with pytest.raises(PlayPurchaseError) as e:
        svc.map_state(sub("SUBSCRIPTION_STATE_PENDING"))
    assert e.value.status_code == 402


def test_unknown_product_rejected(svc):
    with pytest.raises(PlayPurchaseError):
        svc.map_state(sub("SUBSCRIPTION_STATE_ACTIVE", product="other"))


def make_client(monkeypatch):
    app = FastAPI()
    app.include_router(pb.router)
    app.dependency_overrides[get_current_user] = lambda: {"email": "a@example.com"}
    return TestClient(app)


def test_verify_requires_auth():
    app = FastAPI()
    app.include_router(pb.router)
    c = TestClient(app)
    r = c.post("/api/play/verify", json={"product_id": "x", "purchase_token": "t"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_verify_and_apply_acknowledges_and_updates(monkeypatch):
    s = GooglePlayService()
    monkeypatch.setattr(s, "_find_page_id_by_token", lambda t: None)
    monkeypatch.setattr(s, "get_subscription", AsyncMock(return_value=sub("SUBSCRIPTION_STATE_ACTIVE")))
    ack = AsyncMock()
    monkeypatch.setattr(s, "acknowledge", ack)
    upd = AsyncMock(return_value=True)
    monkeypatch.setattr(s.notion_store, "update_user_subscription_in_notion", upd)
    monkeypatch.setattr(s, "_save_play_metadata", lambda e, t: None)

    out = await s.verify_and_apply("a@example.com", "deepspeak_basic_monthly", "tok")
    assert out == {"plan": "Basic", "status": "Active"}
    ack.assert_awaited_once_with("deepspeak_basic_monthly", "tok")
    upd.assert_awaited_once_with(email="a@example.com", plan="Basic", status="Active")


@pytest.mark.asyncio
async def test_verify_skips_ack_when_already_acknowledged(monkeypatch):
    s = GooglePlayService()
    monkeypatch.setattr(s, "_find_page_id_by_token", lambda t: None)
    monkeypatch.setattr(
        s, "get_subscription",
        AsyncMock(return_value=sub("SUBSCRIPTION_STATE_ACTIVE", ack="ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED")),
    )
    ack = AsyncMock()
    monkeypatch.setattr(s, "acknowledge", ack)
    monkeypatch.setattr(s.notion_store, "update_user_subscription_in_notion", AsyncMock(return_value=True))
    monkeypatch.setattr(s, "_save_play_metadata", lambda e, t: None)
    await s.verify_and_apply("a@example.com", "deepspeak_basic_monthly", "tok")
    ack.assert_not_awaited()


@pytest.mark.asyncio
async def test_token_bound_to_other_account_rejected(monkeypatch):
    s = GooglePlayService()
    monkeypatch.setattr(s, "_find_page_id_by_token", lambda t: ("page", "other@example.com"))
    with pytest.raises(PlayPurchaseError) as e:
        await s.verify_and_apply("a@example.com", "deepspeak_basic_monthly", "tok")
    assert e.value.status_code == 409


@pytest.mark.asyncio
async def test_product_mismatch_rejected(monkeypatch):
    s = GooglePlayService()
    monkeypatch.setattr(s, "_find_page_id_by_token", lambda t: None)
    monkeypatch.setattr(s, "get_subscription", AsyncMock(return_value=sub("SUBSCRIPTION_STATE_ACTIVE")))
    with pytest.raises(PlayPurchaseError):
        await s.verify_and_apply("a@example.com", "deepspeak_premium_yearly", "tok")


def rtdn_body(token="tok", pkg="com.yasuhiro.watanabe.deepspeak"):
    note = {"packageName": pkg, "subscriptionNotification": {"purchaseToken": token, "notificationType": 2}}
    data = base64.b64encode(json.dumps(note).encode()).decode()
    return {"message": {"data": data}}


def test_rtdn_rejects_bad_secret():
    app = FastAPI()
    app.include_router(pb.router)
    c = TestClient(app)
    assert c.post("/api/webhooks/play?token=wrong", json=rtdn_body()).status_code == 403
    assert c.post("/api/webhooks/play", json=rtdn_body()).status_code == 403


def test_rtdn_processes(monkeypatch):
    app = FastAPI()
    app.include_router(pb.router)
    h = AsyncMock(return_value=True)
    monkeypatch.setattr(pb.play_service, "handle_rtdn_subscription", h)
    r = TestClient(app).post("/api/webhooks/play?token=rtdn-secret", json=rtdn_body())
    assert r.status_code == 200
    h.assert_awaited_once_with("tok")


def test_rtdn_failure_returns_5xx_for_retry(monkeypatch):
    app = FastAPI()
    app.include_router(pb.router)
    monkeypatch.setattr(pb.play_service, "handle_rtdn_subscription", AsyncMock(return_value=False))
    r = TestClient(app).post("/api/webhooks/play?token=rtdn-secret", json=rtdn_body())
    assert r.status_code == 500


def test_rtdn_ignores_other_package_and_garbage(monkeypatch):
    app = FastAPI()
    app.include_router(pb.router)
    h = AsyncMock(return_value=True)
    monkeypatch.setattr(pb.play_service, "handle_rtdn_subscription", h)
    c = TestClient(app)
    assert c.post("/api/webhooks/play?token=rtdn-secret", json=rtdn_body(pkg="other.app")).json()["status"] == "ignored"
    assert c.post("/api/webhooks/play?token=rtdn-secret", json={"foo": 1}).json()["status"] == "ignored"
    h.assert_not_awaited()
