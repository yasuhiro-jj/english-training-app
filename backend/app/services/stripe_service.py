import stripe
import os
import logging
from typing import Dict, Optional, Tuple
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
        self.notion_token = os.getenv("NOTION_TOKEN")
        self.notion_client = Client(auth=self.notion_token) if self.notion_token else None
        self.user_db_id = os.getenv("NOTION_USER_DATABASE_ID")
        self.user_email_property = os.getenv("NOTION_USER_EMAIL_PROPERTY", "Email")
        self.subscription_plan_property = os.getenv(
            "NOTION_SUBSCRIPTION_PLAN_PROPERTY", "Subscription Plan"
        )
        self.subscription_status_property = os.getenv(
            "NOTION_SUBSCRIPTION_STATUS_PROPERTY", "Subscription Status"
        )
        self._user_db_title_property: Optional[str] = None

        if not self.user_db_id:
            logger.warning("NOTION_USER_DATABASE_ID not configured")
        if not self.notion_token:
            logger.warning("NOTION_TOKEN not configured")

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
            if not self.notion_client:
                logger.error("Notion client not configured (missing NOTION_TOKEN)")
                return False
            if not self.user_db_id:
                logger.error("Notion user database not configured (missing NOTION_USER_DATABASE_ID)")
                return False

            user_id = self._find_user_page_id_by_email(email)
            if not user_id:
                logger.warning(
                    f"User not found in Notion by email. property={self.user_email_property}, email={email}. Creating new user page..."
                )
                user_id = self._create_user_page_with_email(email)
                if not user_id:
                    logger.error(f"Failed to create Notion user page for email={email}")
                    return False

            update_props = {
                self.subscription_plan_property: {"select": {"name": plan}},
                self.subscription_status_property: {"select": {"name": status}},
            }

            try:
                self.notion_client.pages.update(page_id=user_id, properties=update_props)
            except Exception as e:
                # よくある表記ゆれ対応: Cancelled vs Canceled
                msg = str(e)
                if status == "Cancelled":
                    update_props[self.subscription_status_property] = {
                        "select": {"name": "Canceled"}
                    }
                    self.notion_client.pages.update(page_id=user_id, properties=update_props)
                    logger.info(
                        f"✅ Updated Notion subscription for {email}: plan={plan}, status=Canceled (fallback)"
                    )
                    return True

                logger.error(
                    f"Failed to update Notion page properties for {email} (plan={plan}, status={status}): {msg}"
                )
                return False

            # Railway側でINFOが出ない設定のことがあるのでWARNINGでも出す
            logger.warning(
                f"✅ Updated Notion subscription for {email}: plan={plan}, status={status}, page_id={user_id}"
            )
            logger.info(
                f"✅ Updated Notion subscription for {email}: plan={plan}, status={status}, page_id={user_id}"
            )
            return True
        except Exception as e:
            logger.error(f"Failed to update Notion subscription for {email}: {e}")
            return False

    def _find_user_page_id_by_email(self, email: str) -> Optional[str]:
        """
        Notion DB内でユーザーをemailで検索してページIDを返す。
        Notionのプロパティ型は環境により (email / rich_text / title) があり得るため順に試す。
        """
        if not self.notion_client or not self.user_db_id:
            return None

        prop_names = [p.strip() for p in self.user_email_property.split(",") if p.strip()]
        if not prop_names:
            prop_names = ["Email"]

        def _first_result_id(resp: Dict) -> Optional[str]:
            results = (resp or {}).get("results") or []
            return results[0]["id"] if results else None

        for prop in prop_names:
            # 1) Email property type
            try:
                resp = self.notion_client.databases.query(
                    database_id=self.user_db_id,
                    filter={"property": prop, "email": {"equals": email}},
                )
                page_id = _first_result_id(resp)
                if page_id:
                    return page_id
            except Exception:
                pass

            # 2) Rich text property type
            try:
                resp = self.notion_client.databases.query(
                    database_id=self.user_db_id,
                    filter={"property": prop, "rich_text": {"equals": email}},
                )
                page_id = _first_result_id(resp)
                if page_id:
                    return page_id
            except Exception:
                pass

            # 3) Title property type
            try:
                resp = self.notion_client.databases.query(
                    database_id=self.user_db_id,
                    filter={"property": prop, "title": {"equals": email}},
                )
                page_id = _first_result_id(resp)
                if page_id:
                    return page_id
            except Exception:
                pass

        return None

    def _get_user_db_title_property(self) -> Optional[str]:
        """
        Notion DB の title プロパティ名を取得（ページ作成に必須）。
        取得できなければ一般的な 'Name' を試す。
        """
        if self._user_db_title_property is not None:
            return self._user_db_title_property
        if not self.notion_client or not self.user_db_id:
            self._user_db_title_property = None
            return None

        try:
            db = self.notion_client.databases.retrieve(database_id=self.user_db_id)
            props = (db or {}).get("properties") or {}
            for prop_name, prop_def in props.items():
                if (prop_def or {}).get("type") == "title":
                    self._user_db_title_property = prop_name
                    return prop_name
        except Exception as e:
            logger.warning(f"Failed to retrieve Notion user DB schema: {e}")

        # フォールバック
        self._user_db_title_property = "Name"
        return self._user_db_title_property

    def _build_email_property_payload(self, email: str, prop_name: str, prop_type: str) -> Dict:
        if prop_type == "email":
            return {prop_name: {"email": email}}
        if prop_type == "rich_text":
            return {prop_name: {"rich_text": [{"text": {"content": email}}]}}
        if prop_type == "title":
            return {prop_name: {"title": [{"text": {"content": email}}]}}
        raise ValueError(f"Unsupported email property type: {prop_type}")

    def _create_user_page_with_email(self, email: str) -> Optional[str]:
        """
        Notion ユーザーDBに、Email=Stripeのメールで新規ページ（新規行）を作成する。
        Emailプロパティの型が (email / rich_text / title) のいずれでも動くように試行する。
        """
        if not self.notion_client or not self.user_db_id:
            return None

        # title プロパティ（必須）
        title_prop = self._get_user_db_title_property()
        title_payload = {}
        if title_prop:
            title_payload = {title_prop: {"title": [{"text": {"content": email}}]}}

        prop_names = [p.strip() for p in self.user_email_property.split(",") if p.strip()]
        if not prop_names:
            prop_names = ["Email"]

        # Emailプロパティは型が分からないことがあるので順に試す
        attempts: Tuple[Tuple[str, str], ...] = (("email", "email"), ("rich_text", "rich_text"), ("title", "title"))
        for prop in prop_names:
            for notion_filter_key, notion_type in attempts:
                try:
                    email_payload = self._build_email_property_payload(email, prop, notion_type)
                    props = {**title_payload, **email_payload}
                    created = self.notion_client.pages.create(
                        parent={"database_id": self.user_db_id},
                        properties=props,
                    )
                    page_id = (created or {}).get("id")
                    if page_id:
                        logger.warning(f"✅ Created Notion user page for email={email}, page_id={page_id}")
                        return page_id
                except Exception as e:
                    # 次の型/プロパティ名を試す
                    logger.info(f"Notion create attempt failed. prop={prop}, type={notion_filter_key}: {e}")
                    continue

        return None

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
            email = (
                customer.get("email")
                or invoice.get("customer_email")
                or (invoice.get("customer_details") or {}).get("email")
            )
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
            logger.warning(
                f"invoice.payment_succeeded: email={email}, subscription_id={subscription_id}, price_id={price_id}, plan={plan}"
            )

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
            # 新規テスト price（Basic 月額 2999円 テスト２）
            "price_1T4LhqEiUgLSKtAjqiTGPPaL": "Basic",
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
