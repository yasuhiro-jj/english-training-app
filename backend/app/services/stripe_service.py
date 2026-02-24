import stripe
import os
import logging
from typing import Dict, Optional
from notion_client import Client

logger = logging.getLogger(__name__)


class StripeService:
    """Stripe Webhook & Subscription管理サービス"""

    def __init__(self):
        self.api_key = os.getenv("STRIPE_SECRET_KEY")
        if self.api_key:
            stripe.api_key = self.api_key
        else:
            logger.warning("STRIPE_SECRET_KEY not configured")

        self.webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        self.notion_client = Client(auth=os.getenv("NOTION_TOKEN"))
        self.user_db_id = os.getenv("NOTION_USER_DATABASE_ID")

    def construct_event(self, payload: bytes, sig_header: str) -> Optional[Dict]:
        """
        Webhook署名を検証してイベントを構築
        """
        if not self.webhook_secret:
            logger.error("STRIPE_WEBHOOK_SECRET not configured")
            return None

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, self.webhook_secret
            )
            return event
        except ValueError as e:
            logger.error(f"Invalid payload: {e}")
            return None
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid signature: {e}")
            return None

    async def update_user_subscription_in_notion(
        self, email: str, plan: str, status: str
    ) -> bool:
        """
        Notionのユーザーデータベースでサブスクリプション情報を更新

        Args:
            email: ユーザーのメールアドレス
            plan: "Basic" | "Premium" | "Free"
            status: "Active" | "Cancelled" | "Expired" | "Trial"

        Returns:
            True if successful, False otherwise
        """
        try:
            response = self.notion_client.databases.query(
                database_id=self.user_db_id,
                filter={"property": "Email", "rich_text": {"equals": email}},
            )

            if not response.get("results"):
                logger.warning(f"User not found in Notion: {email}")
                return False

            user_id = response["results"][0]["id"]

            update_props = {
                "Subscription Plan": {"select": {"name": plan.capitalize()}},
                "Subscription Status": {"select": {"name": status.capitalize()}},
            }

            self.notion_client.pages.update(page_id=user_id, properties=update_props)

            logger.info(
                f"✅ Updated Notion subscription for {email}: plan={plan}, status={status}"
            )
            return True
        except Exception as e:
            logger.error(f"Failed to update Notion subscription for {email}: {e}")
            return False

    async def handle_subscription_created(self, subscription: Dict) -> bool:
        """
        customer.subscription.created イベント処理
        """
        try:
            customer_id = subscription.get("customer")
            if not customer_id:
                logger.warning("No customer in subscription.created")
                return False

            customer = stripe.Customer.retrieve(customer_id)
            email = customer.get("email")
            if not email:
                logger.warning(f"No email for customer {customer_id}")
                return False

            # Stripe の price_id から plan を判定
            items = subscription.get("items", {}).get("data", [])
            if not items:
                logger.warning("No items in subscription")
                return False

            price_id = items[0].get("price", {}).get("id", "")
            plan = self._map_price_to_plan(price_id)

            return await self.update_user_subscription_in_notion(
                email=email, plan=plan, status="Active"
            )
        except Exception as e:
            logger.error(f"Error handling subscription.created: {e}")
            return False

    async def handle_subscription_updated(self, subscription: Dict) -> bool:
        """
        customer.subscription.updated イベント処理
        """
        try:
            customer_id = subscription.get("customer")
            if not customer_id:
                return False

            customer = stripe.Customer.retrieve(customer_id)
            email = customer.get("email")
            if not email:
                return False

            items = subscription.get("items", {}).get("data", [])
            if not items:
                return False

            price_id = items[0].get("price", {}).get("id", "")
            plan = self._map_price_to_plan(price_id)

            # Stripe の status を Notion の status にマッピング
            stripe_status = subscription.get("status", "")
            notion_status = self._map_stripe_status(stripe_status)

            return await self.update_user_subscription_in_notion(
                email=email, plan=plan, status=notion_status
            )
        except Exception as e:
            logger.error(f"Error handling subscription.updated: {e}")
            return False

    async def handle_subscription_deleted(self, subscription: Dict) -> bool:
        """
        customer.subscription.deleted イベント処理
        """
        try:
            customer_id = subscription.get("customer")
            if not customer_id:
                return False

            customer = stripe.Customer.retrieve(customer_id)
            email = customer.get("email")
            if not email:
                return False

            return await self.update_user_subscription_in_notion(
                email=email, plan="Free", status="Cancelled"
            )
        except Exception as e:
            logger.error(f"Error handling subscription.deleted: {e}")
            return False

    async def handle_invoice_payment_succeeded(self, invoice: Dict) -> bool:
        """
        invoice.payment_succeeded イベント処理
        （初回決済・更新時の支払い成功）
        """
        try:
            customer_id = invoice.get("customer")
            if not customer_id:
                return False

            customer = stripe.Customer.retrieve(customer_id)
            email = customer.get("email")
            if not email:
                return False

            subscription_id = invoice.get("subscription")
            if not subscription_id:
                logger.info(f"Invoice without subscription for {email}")
                return True

            subscription = stripe.Subscription.retrieve(subscription_id)
            items = subscription.get("items", {}).get("data", [])
            if not items:
                return False

            price_id = items[0].get("price", {}).get("id", "")
            plan = self._map_price_to_plan(price_id)

            return await self.update_user_subscription_in_notion(
                email=email, plan=plan, status="Active"
            )
        except Exception as e:
            logger.error(f"Error handling invoice.payment_succeeded: {e}")
            return False

    def _map_price_to_plan(self, price_id: str) -> str:
        """
        Stripe の price_id から plan 名を判定
        """
        PRICE_MAP = {
            # Basic プラン
            "price_1SwjGfEiUgLSKtAjLqYrKVzB": "Basic",  # 月額 ¥2,980
            "price_1SwjGgEiUgLSKtAjzA2lmB0W": "Basic",  # 年額 ¥29,800
            # Premium プラン
            "price_1SwjLTEiUgLSKtAjfQJ1P2uI": "Premium",  # 月額 ¥4,980
            "price_1SwjLTEiUgLSKtAjTjTqh8w8": "Premium",  # 年額 ¥49,800
        }
        
        plan = PRICE_MAP.get(price_id)
        if plan:
            return plan
        
        # フォールバック: 不明なprice_idの場合はログに残してBasicとして扱う
        logger.warning(f"Unknown price_id: {price_id}, defaulting to Basic")
        return "Basic"

    def _map_stripe_status(self, stripe_status: str) -> str:
        """
        Stripe の subscription.status を Notion の status にマッピング
        """
        status_map = {
            "active": "Active",
            "trialing": "Trial",
            "past_due": "Active",  # 支払い遅延でも一時的にActiveとして扱う
            "canceled": "Cancelled",
            "unpaid": "Expired",
            "incomplete": "Trial",
            "incomplete_expired": "Expired",
        }
        return status_map.get(stripe_status.lower(), "Active")
