import os
import sys
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.services.stripe_service import StripeService  # noqa: E402


def make_service(page_props):
    s = StripeService()
    s.notion_client = MagicMock()
    s.user_db_id = "db"
    s.notion_client.pages.retrieve.return_value = {"properties": page_props}
    s._find_user_page_id_by_email = lambda email: "page-1"
    return s


def sel(name):
    return {"select": {"name": name}}


@pytest.mark.asyncio
async def test_stripe_event_skipped_when_play_subscription_active():
    s = make_service({"Subscription Source": sel("Play"), "Subscription Status": sel("Active")})
    ok = await s.update_user_subscription_in_notion("a@example.com", "Free", "Cancelled", source="Stripe")
    assert ok is True
    s.notion_client.pages.update.assert_not_called()


@pytest.mark.asyncio
async def test_stripe_event_applies_when_play_subscription_ended():
    s = make_service({"Subscription Source": sel("Play"), "Subscription Status": sel("Cancelled")})
    ok = await s.update_user_subscription_in_notion("a@example.com", "Basic", "Active", source="Stripe")
    assert ok is True
    calls = s.notion_client.pages.update.call_args_list
    assert len(calls) == 2  # プラン/ステータス更新 + 購入元の記録
    assert calls[1].kwargs["properties"] == {"Subscription Source": sel("Stripe")}


@pytest.mark.asyncio
async def test_stripe_event_applies_for_stripe_user_and_records_source():
    s = make_service({"Subscription Source": sel("Stripe"), "Subscription Status": sel("Active")})
    ok = await s.update_user_subscription_in_notion("a@example.com", "Premium", "Active", source="Stripe")
    assert ok is True
    assert s.notion_client.pages.update.call_count == 2


@pytest.mark.asyncio
async def test_no_source_means_no_guard_and_no_source_write():
    # Play 側 (verify / RTDN) の呼び出し: source を渡さない
    s = make_service({"Subscription Source": sel("Stripe"), "Subscription Status": sel("Active")})
    ok = await s.update_user_subscription_in_notion("a@example.com", "Basic", "Active")
    assert ok is True
    s.notion_client.pages.retrieve.assert_not_called()
    assert s.notion_client.pages.update.call_count == 1


@pytest.mark.asyncio
async def test_missing_source_property_does_not_block_stripe():
    # Notion に項目が無い（取得できない）環境でも、従来どおり更新できる
    s = make_service({})
    ok = await s.update_user_subscription_in_notion("a@example.com", "Basic", "Active", source="Stripe")
    assert ok is True
    assert s.notion_client.pages.update.call_count == 2
