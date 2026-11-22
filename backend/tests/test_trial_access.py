import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault("JWT_SECRET_KEY", "test-secret")

import app.services.usage_service as usage_module  # noqa: E402
from app.services.usage_service import UsageService  # noqa: E402


def _iso(dt):
    return dt.isoformat()


def _service(props=None, error=False):
    svc = UsageService()

    def query(**_kwargs):
        if error:
            raise RuntimeError("notion down")
        return {"results": [{"properties": props}] if props is not None else []}

    svc.client = SimpleNamespace(databases=SimpleNamespace(query=query))
    return svc


def _props(plan=None, status=None, trial_end=None, created=None):
    props = {}
    if plan:
        props["Subscription Plan"] = {"select": {"name": plan}}
    if status:
        props["Subscription Status"] = {"select": {"name": status}}
    if trial_end:
        props["Trial Ends At"] = {"date": {"start": _iso(trial_end)}}
    if created:
        props["CreatedAt"] = {"date": {"start": _iso(created)}}
    return props


NOW = datetime.now(timezone.utc)


def test_new_user_within_seven_days_has_full_access():
    svc = _service(_props(trial_end=NOW + timedelta(days=6), created=NOW - timedelta(days=1)))
    sub = asyncio.run(svc.get_user_subscription_status("a@example.com"))
    assert sub["status"] == "trial" and sub["is_trial"] is True
    assert asyncio.run(svc.check_access("a@example.com"))["allowed"] is True


def test_trial_has_no_daily_limits():
    svc = _service(_props(trial_end=NOW + timedelta(days=3)))
    assert asyncio.run(svc.can_use_lesson("a@example.com"))["allowed"] is True
    assert asyncio.run(svc.can_use_ai_chat("a@example.com"))["allowed"] is True
    whisper = asyncio.run(svc.can_use_whisper("a@example.com", 600))
    assert whisper["allowed"] is True and whisper["remaining_minutes"] is None


def test_after_seven_days_all_ai_features_are_blocked():
    svc = _service(_props(trial_end=NOW - timedelta(hours=1)))
    sub = asyncio.run(svc.get_user_subscription_status("a@example.com"))
    assert sub["status"] == "expired" and sub["is_trial"] is False
    for result in (
        asyncio.run(svc.check_access("a@example.com")),
        asyncio.run(svc.can_use_lesson("a@example.com")),
        asyncio.run(svc.can_use_ai_chat("a@example.com")),
        asyncio.run(svc.can_use_whisper("a@example.com", 1)),
    ):
        assert result["allowed"] is False
        assert "プラン" in result["reason"]


def test_naive_notion_date_is_treated_as_utc_without_crashing():
    end = (NOW - timedelta(days=1)).replace(tzinfo=None)
    svc = _service({"Trial Ends At": {"date": {"start": end.isoformat()}}})
    sub = asyncio.run(svc.get_user_subscription_status("a@example.com"))
    assert sub["status"] == "expired"


def test_existing_user_without_end_date_gets_seven_days_from_enforcement_start(monkeypatch):
    props = _props(created=NOW - timedelta(days=200))
    monkeypatch.setattr(usage_module, "TRIAL_ENFORCEMENT_START", NOW - timedelta(days=1))
    assert asyncio.run(_service(props).check_access("a@example.com"))["allowed"] is True

    monkeypatch.setattr(usage_module, "TRIAL_ENFORCEMENT_START", NOW - timedelta(days=8))
    assert asyncio.run(_service(props).check_access("a@example.com"))["allowed"] is False


def test_user_created_after_enforcement_without_end_date_counts_from_created(monkeypatch):
    monkeypatch.setattr(usage_module, "TRIAL_ENFORCEMENT_START", NOW - timedelta(days=30))
    recent = _props(created=NOW - timedelta(days=2))
    old = _props(created=NOW - timedelta(days=10))
    assert asyncio.run(_service(recent).check_access("a@example.com"))["allowed"] is True
    assert asyncio.run(_service(old).check_access("a@example.com"))["allowed"] is False


def test_active_paid_plan_is_allowed_even_after_trial_period():
    for plan in ("Basic", "Premium"):
        svc = _service(_props(plan=plan, status="Active", trial_end=NOW - timedelta(days=30)))
        sub = asyncio.run(svc.get_user_subscription_status("a@example.com"))
        assert sub["status"] == "active" and sub["is_trial"] is False
        assert asyncio.run(svc.check_access("a@example.com"))["allowed"] is True


def test_lapsed_paid_plan_is_blocked():
    for status in ("Expired", "Cancelled", "Canceled"):
        svc = _service(_props(plan="Premium", status=status))
        assert asyncio.run(svc.check_access("a@example.com"))["allowed"] is False


def test_cancelled_subscriber_written_back_as_free_has_no_free_plan():
    # 解約後は「Free / Cancelled」と書き戻される。無料プランはないので、体験期間が過ぎていれば使えない
    svc = _service(_props(plan="Free", status="Cancelled", trial_end=NOW - timedelta(days=60)))
    assert asyncio.run(svc.check_access("a@example.com"))["allowed"] is False


def test_unlimited_account_is_always_allowed(monkeypatch):
    # 体験が終わっていても、契約が切れていても、運営者のアカウントはいつでも使える
    monkeypatch.setenv("UNLIMITED_ACCESS_EMAILS", " Owner@Example.com , other@example.com ")
    expired = _props(plan="Free", status="Cancelled", trial_end=NOW - timedelta(days=90))
    svc = _service(expired)
    assert asyncio.run(svc.check_access("owner@example.com"))["allowed"] is True
    assert asyncio.run(svc.check_access("OTHER@example.com"))["allowed"] is True
    assert asyncio.run(svc.can_use_lesson("owner@example.com"))["allowed"] is True
    sub = asyncio.run(svc.get_user_subscription_status("owner@example.com"))
    assert sub["status"] == "active" and sub["is_trial"] is False
    # 一覧にないアカウントは、通常どおり止まる
    assert asyncio.run(svc.check_access("someone@example.com"))["allowed"] is False


def test_unlimited_accounts_unset_means_nobody_is_exempt(monkeypatch):
    monkeypatch.delenv("UNLIMITED_ACCESS_EMAILS", raising=False)
    svc = _service(_props(trial_end=NOW - timedelta(days=1)))
    assert asyncio.run(svc.check_access("owner@example.com"))["allowed"] is False


def test_notion_error_does_not_lock_users_out():
    svc = _service(error=True)
    assert asyncio.run(svc.check_access("a@example.com"))["allowed"] is True
