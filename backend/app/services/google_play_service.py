import asyncio
import base64
import json
import logging
import os
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple

import httpx
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import service_account
from notion_client import Client

from app.services.stripe_service import StripeService

logger = logging.getLogger(__name__)

ANDROID_PUBLISHER_BASE = "https://androidpublisher.googleapis.com/androidpublisher/v3"
ANDROID_PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher"

# Play Console の定期購入商品ID -> プラン名。
# Digital Goods API は定期購入IDで商品を指定するため、プラン(月額/年額)ごとに商品を分けている。
DEFAULT_PRODUCT_PLAN_MAP = (
    "deepspeak_basic_monthly:Basic,"
    "deepspeak_basic_yearly:Basic,"
    "deepspeak_premium_monthly:Premium,"
    "deepspeak_premium_yearly:Premium"
)


class PlayPurchaseError(Exception):
    """購入の検証に失敗したときのエラー（HTTPステータス付き）"""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


class GooglePlayService:
    """Google Play 定期購入の検証・承認と、Notion のサブスク状態への反映"""

    def __init__(self):
        self.package_name = os.getenv(
            "GOOGLE_PLAY_PACKAGE_NAME", "com.yasuhiro.watanabe.deepspeak"
        )
        self.product_plan_map = self._parse_product_plan_map(
            os.getenv("GOOGLE_PLAY_PRODUCT_PLAN_MAP", DEFAULT_PRODUCT_PLAN_MAP)
        )
        self.rtdn_secret = os.getenv("GOOGLE_PLAY_RTDN_SECRET", "")
        self._credentials: Optional[service_account.Credentials] = None

        # Notion のサブスク更新ロジックは StripeService のものを共用する
        self.notion_store = StripeService()
        self.notion_client: Optional[Client] = self.notion_store.notion_client
        self.user_db_id = self.notion_store.user_db_id
        self.token_property = os.getenv(
            "NOTION_PLAY_PURCHASE_TOKEN_PROPERTY", "Play Purchase Token"
        )
        self.source_property = os.getenv(
            "NOTION_SUBSCRIPTION_SOURCE_PROPERTY", "Subscription Source"
        )

    # ---------- 設定 ----------

    @staticmethod
    def _parse_product_plan_map(raw: str) -> Dict[str, str]:
        result: Dict[str, str] = {}
        for pair in raw.split(","):
            if ":" not in pair:
                continue
            product_id, plan = pair.split(":", 1)
            if product_id.strip() and plan.strip():
                result[product_id.strip()] = plan.strip()
        return result

    def is_configured(self) -> bool:
        return bool(os.getenv("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"))

    def _load_credentials(self) -> service_account.Credentials:
        if self._credentials is not None:
            return self._credentials
        raw = os.getenv("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON", "").strip()
        if not raw:
            raise PlayPurchaseError("Google Play is not configured", 503)
        # JSONそのもの、または base64 化した JSON のどちらも受け付ける
        if not raw.startswith("{"):
            raw = base64.b64decode(raw).decode("utf-8")
        info = json.loads(raw)
        self._credentials = service_account.Credentials.from_service_account_info(
            info, scopes=[ANDROID_PUBLISHER_SCOPE]
        )
        return self._credentials

    def _get_access_token_sync(self) -> str:
        creds = self._load_credentials()
        if not creds.valid:
            creds.refresh(GoogleAuthRequest())
        return creds.token

    async def _access_token(self) -> str:
        return await asyncio.to_thread(self._get_access_token_sync)

    # ---------- Google Play API ----------

    async def get_subscription(self, purchase_token: str) -> Dict:
        """purchases.subscriptionsv2.get で購入の最新状態を取得"""
        token = await self._access_token()
        url = (
            f"{ANDROID_PUBLISHER_BASE}/applications/{self.package_name}"
            f"/purchases/subscriptionsv2/tokens/{purchase_token}"
        )
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
        if resp.status_code in (400, 404, 410):
            raise PlayPurchaseError("Purchase token not found or invalid", 400)
        if resp.status_code != 200:
            logger.error(f"Play API error {resp.status_code}: {resp.text[:300]}")
            raise PlayPurchaseError("Failed to verify purchase with Google Play", 502)
        return resp.json()

    async def acknowledge(self, product_id: str, purchase_token: str) -> None:
        """未承認の購入を承認する（3日以内に承認しないと自動返金される）"""
        token = await self._access_token()
        url = (
            f"{ANDROID_PUBLISHER_BASE}/applications/{self.package_name}"
            f"/purchases/subscriptions/{product_id}/tokens/{purchase_token}:acknowledge"
        )
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                url,
                headers={"Authorization": f"Bearer {token}"},
                json={},
            )
        if resp.status_code not in (200, 204):
            logger.error(f"Play acknowledge failed {resp.status_code}: {resp.text[:300]}")
            raise PlayPurchaseError("Failed to acknowledge purchase", 502)

    # ---------- 状態の解釈 ----------

    def _first_line_item(self, sub: Dict) -> Dict:
        items = sub.get("lineItems") or []
        if not items:
            raise PlayPurchaseError("No line items in subscription", 400)
        return items[0]

    def map_state(self, sub: Dict) -> Tuple[str, str]:
        """
        subscriptionsv2 の状態を (plan, status) に変換する。
        plan は商品IDから決まり、期限切れ・失効時は Free / Cancelled に戻す。
        status は Notion 側の Active / Cancelled / Expired / Trial に合わせる。
        """
        line = self._first_line_item(sub)
        product_id = line.get("productId", "")
        plan = self.product_plan_map.get(product_id)
        if not plan:
            raise PlayPurchaseError(f"Unknown product: {product_id}", 400)

        state = sub.get("subscriptionState", "")
        expiry = self._parse_time(line.get("expiryTime"))
        not_expired = expiry is None or expiry > datetime.now(timezone.utc)

        if state in ("SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"):
            return plan, "Active"
        if state == "SUBSCRIPTION_STATE_CANCELED":
            # 解約済みでも期限までは利用可能
            return (plan, "Active") if not_expired else ("Free", "Cancelled")
        if state in ("SUBSCRIPTION_STATE_ON_HOLD", "SUBSCRIPTION_STATE_PAUSED"):
            return plan, "Expired"
        if state == "SUBSCRIPTION_STATE_EXPIRED":
            return "Free", "Cancelled"
        # PENDING など。利用権は付与しない
        raise PlayPurchaseError(f"Subscription not active: {state}", 402)

    @staticmethod
    def _parse_time(value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None

    # ---------- Notion 連携 ----------

    def _find_page_id_by_token(self, purchase_token: str) -> Optional[Tuple[str, str]]:
        """購入トークンに紐づく Notion ユーザー (page_id, email) を返す"""
        if not self.notion_client or not self.user_db_id:
            return None
        try:
            resp = self.notion_client.databases.query(
                database_id=self.user_db_id,
                filter={
                    "property": self.token_property,
                    "rich_text": {"equals": purchase_token},
                },
            )
        except Exception as e:
            logger.error(f"Notion query by purchase token failed: {e}")
            return None
        results = resp.get("results") or []
        if not results:
            return None
        page = results[0]
        email = self._extract_email(page)
        return page["id"], email

    def _extract_email(self, page: Dict) -> str:
        props = page.get("properties", {})
        for name in self.notion_store.user_email_property.split(","):
            prop = props.get(name.strip(), {})
            if prop.get("email"):
                return prop["email"]
            for key in ("rich_text", "title"):
                parts = prop.get(key) or []
                if parts:
                    return "".join(p.get("plain_text", "") for p in parts)
        return ""

    def _save_play_metadata(self, email: str, purchase_token: str) -> None:
        """購入トークンと購入元を Notion に保存する（項目が無い場合は警告のみ）"""
        try:
            page_id = self.notion_store._find_user_page_id_by_email(email)
            if not page_id:
                return
            self.notion_client.pages.update(
                page_id=page_id,
                properties={
                    self.token_property: {
                        "rich_text": [{"text": {"content": purchase_token}}]
                    },
                    self.source_property: {"select": {"name": "Play"}},
                },
            )
        except Exception as e:
            logger.error(
                f"Failed to save Play metadata to Notion for {email}: {e}. "
                f"Check that '{self.token_property}' (text) and "
                f"'{self.source_property}' (select) exist in the user DB."
            )
            raise PlayPurchaseError("Failed to save purchase", 500)

    # ---------- 公開メソッド ----------

    async def verify_and_apply(
        self, email: str, product_id: str, purchase_token: str
    ) -> Dict[str, str]:
        """アプリからの購入通知を検証し、Notion に反映して必要なら承認する"""
        bound = await asyncio.to_thread(self._find_page_id_by_token, purchase_token)
        if bound and bound[1] and bound[1].lower() != email.lower():
            raise PlayPurchaseError("Purchase already linked to another account", 409)

        sub = await self.get_subscription(purchase_token)
        line = self._first_line_item(sub)
        if line.get("productId") != product_id:
            raise PlayPurchaseError("Product mismatch", 400)

        plan, status = self.map_state(sub)

        if sub.get("acknowledgementState") == "ACKNOWLEDGEMENT_STATE_PENDING":
            await self.acknowledge(product_id, purchase_token)

        ok = await self.notion_store.update_user_subscription_in_notion(
            email=email, plan=plan, status=status
        )
        if not ok:
            raise PlayPurchaseError("Failed to update subscription", 500)
        await asyncio.to_thread(self._save_play_metadata, email, purchase_token)
        logger.warning(f"Play purchase applied: email={email}, plan={plan}, status={status}")
        return {"plan": plan, "status": status}

    async def handle_rtdn_subscription(self, purchase_token: str) -> bool:
        """RTDN（更新・解約・期限切れ等）を受けて Notion を更新する"""
        bound = await asyncio.to_thread(self._find_page_id_by_token, purchase_token)
        if not bound or not bound[1]:
            # アプリ側の verify 前に通知が届いた場合など。verify で状態が反映されるので成功扱いにする
            logger.warning("RTDN for unknown purchase token; ignoring")
            return True
        email = bound[1]

        sub = await self.get_subscription(purchase_token)
        try:
            plan, status = self.map_state(sub)
        except PlayPurchaseError as e:
            logger.info(f"RTDN: no state change applied ({e})")
            return True

        return await self.notion_store.update_user_subscription_in_notion(
            email=email, plan=plan, status=status
        )
