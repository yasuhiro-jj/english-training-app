from notion_client import Client
import os
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

# 無料プランはなし。登録後7日間はフル機能、その後は有料プランが必須。
TRIAL_DAYS = 7

# 体験の終了日が未設定の既存ユーザーは、この日(またはそのユーザーの登録日の遅い方)から7日間を体験期間とする
TRIAL_ENFORCEMENT_START = datetime.fromisoformat(
    os.getenv("TRIAL_ENFORCEMENT_START", "2026-11-22T00:00:00+00:00")
)

ACCESS_EXPIRED_MESSAGE = "7日間の無料体験が終了しました。引き続きご利用いただくには、プランをお選びください。自動課金は一切発生しません。"

PAID_PLANS = ("basic", "premium")

# 運営者・関係者のアカウントなど、体験期間や契約に関係なくいつでも使えるメールアドレス(カンマ区切り)。
# Railwayの環境変数 UNLIMITED_ACCESS_EMAILS で設定する(コードに個人のアドレスは書かない)
UNLIMITED_ACCESS_ENV = "UNLIMITED_ACCESS_EMAILS"


def is_unlimited_account(email: Optional[str]) -> bool:
    if not email:
        return False
    allowed = {e.strip().lower() for e in os.getenv(UNLIMITED_ACCESS_ENV, "").split(",") if e.strip()}
    return email.strip().lower() in allowed


def parse_notion_datetime(value: Optional[str]) -> Optional[datetime]:
    """Notionの日付文字列を、タイムゾーン付き(UTC)のdatetimeに変換する。"""
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


class UsageService:
    """Whisper使用量追跡サービス"""
    
    def __init__(self):
        self.client = Client(auth=os.getenv("NOTION_TOKEN"))
        self.user_db_id = os.getenv("NOTION_USER_DATABASE_ID")
    
    async def get_user_subscription_status(self, email: str) -> Dict:
        """
        ユーザーのサブスクリプション状態を取得
        
        重要: 自動課金は一切発生しません。無料プランはなく、登録後7日間の体験期間が
        終わると、ユーザーが明示的にプランを選択するまでstatusが"expired"となり、
        AI機能は使えません。

        Returns:
            {
                "plan": "free" | "basic" | "premium",
                "status": "trial" | "active" | "expired",
                "trial_ends_at": Optional[datetime],
                "is_trial": bool
            }
        """
        # 常時利用できるアカウント(運営者など)は、体験期間・契約に関係なく有料プラン相当として扱う
        if is_unlimited_account(email):
            return {
                "plan": "premium",
                "status": "active",
                "trial_ends_at": None,
                "is_trial": False
            }

        try:
            response = self.client.databases.query(
                database_id=self.user_db_id,
                filter={
                    "property": "Email",
                    "rich_text": {
                        "equals": email
                    }
                }
            )
            
            if not response.get("results"):
                # ユーザーが見つからない場合、デフォルトで無料体験として扱う
                return {
                    "plan": "free",
                    "status": "trial",
                    "trial_ends_at": None,
                    "is_trial": True
                }
            
            user = response["results"][0]
            props = user["properties"]
            
            # サブスクリプションプランを取得（デフォルト: free）
            plan_select = props.get("Subscription Plan", {}).get("select", {})
            plan = plan_select.get("name", "Free").lower() if plan_select else "free"
            
            # サブスクリプションステータスを取得（デフォルト: trial）
            status_select = props.get("Subscription Status", {}).get("select", {})
            status = status_select.get("name", "Trial").lower() if status_select else "trial"

            # 有料プラン(Basic/Premium)で購読が有効な間だけ利用できる。解約・失効後は使えない
            if plan in PAID_PLANS:
                if status == "active":
                    return {
                        "plan": plan,
                        "status": "active",
                        "trial_ends_at": None,
                        "is_trial": False
                    }
                return {
                    "plan": plan,
                    "status": "expired",
                    "trial_ends_at": None,
                    "is_trial": False
                }

            # 無料体験の終了日(登録時に保存)。未設定の既存ユーザーは登録日などから算出する
            trial_date = (props.get("Trial Ends At") or {}).get("date") or {}
            trial_ends_at = parse_notion_datetime(trial_date.get("start"))
            if trial_ends_at is None:
                created = parse_notion_datetime(((props.get("CreatedAt") or {}).get("date") or {}).get("start"))
                base = max(created, TRIAL_ENFORCEMENT_START) if created else TRIAL_ENFORCEMENT_START
                trial_ends_at = base + timedelta(days=TRIAL_DAYS)

            # 体験期間内ならフル機能、過ぎたら使えない(無料プランはなし)
            is_trial = status != "expired" and datetime.now(timezone.utc) <= trial_ends_at
            if not is_trial:
                status = "expired"
            else:
                status = "trial"

            return {
                "plan": plan,
                "status": status,
                "trial_ends_at": trial_ends_at,
                "is_trial": is_trial
            }
        except Exception as e:
            logger.error(f"Error getting subscription status: {e}")
            # エラー時は安全のため無料体験として扱う
            return {
                "plan": "free",
                "status": "trial",
                "trial_ends_at": None,
                "is_trial": True
            }
    
    async def get_whisper_usage_this_month(self, email: str) -> float:
        """今月のWhisper使用分数を取得"""
        try:
            response = self.client.databases.query(
                database_id=self.user_db_id,
                filter={
                    "property": "Email",
                    "rich_text": {
                        "equals": email
                    }
                }
            )
            
            if not response.get("results"):
                return 0.0
            
            user = response["results"][0]
            props = user["properties"]
            
            # Whisper使用量を取得
            usage_prop = props.get("Whisper Usage Minutes (This Month)", {}).get("number")
            return float(usage_prop) if usage_prop is not None else 0.0
        except Exception as e:
            logger.error(f"Error getting Whisper usage: {e}")
            return 0.0
    
    async def add_whisper_usage(self, email: str, minutes: float):
        """Whisper使用分数を追加"""
        try:
            response = self.client.databases.query(
                database_id=self.user_db_id,
                filter={
                    "property": "Email",
                    "rich_text": {
                        "equals": email
                    }
                }
            )
            
            if not response.get("results"):
                logger.warning(f"User not found: {email}")
                return
            
            user_id = response["results"][0]["id"]
            props = response["results"][0]["properties"]
            
            # 現在の使用量を取得
            current_usage = props.get("Whisper Usage Minutes (This Month)", {}).get("number", 0.0) or 0.0
            current_total = props.get("Whisper Usage Minutes (Total)", {}).get("number", 0.0) or 0.0
            
            # 使用量を更新
            new_usage = current_usage + minutes
            new_total = current_total + minutes
            
            update_props = {
                "Whisper Usage Minutes (This Month)": {"number": new_usage},
                "Whisper Usage Minutes (Total)": {"number": new_total},
                "Last Whisper Usage Date": {"date": {"start": datetime.now().isoformat()}}
            }
            
            self.client.pages.update(
                page_id=user_id,
                properties=update_props
            )
            
            logger.info(f"Updated Whisper usage for {email}: +{minutes:.2f} minutes (total this month: {new_usage:.2f})")
        except Exception as e:
            logger.error(f"Error adding Whisper usage: {e}")
            raise
    
    async def can_use_whisper(self, email: str, requested_minutes: float) -> Dict:
        """
        Whisper使用可能かチェック
        
        重要: 自動課金は一切発生しません。
        体験期間終了後は、ユーザーが明示的にプランを選択するまでサービスを制限します。
        
        Returns:
            {
                "allowed": bool,
                "reason": str,
                "remaining_minutes": Optional[float],
                "should_fallback_to_stt": bool
            }
        """
        access = await self.check_access(email)
        if not access["allowed"]:
            return {
                "allowed": False,
                "reason": access["reason"],
                "remaining_minutes": 0.0,
                "should_fallback_to_stt": False
            }

        # 体験期間中・有料プランともに、音声認識の回数・時間の制限はなし
        return {
            "allowed": True,
            "reason": "",
            "remaining_minutes": None,
            "should_fallback_to_stt": False
        }

    async def check_access(self, email: str) -> Dict:
        """
        AI機能(レッスン生成・AIコーチング・音声認識・読み上げ・解析)を使えるかを判定する。
        体験期間(登録後7日間)中、または有料プランの購読が有効な間だけ使える。

        Returns:
            {"allowed": bool, "reason": str}
        """
        subscription = await self.get_user_subscription_status(email)
        if subscription.get("status") == "expired":
            return {"allowed": False, "reason": ACCESS_EXPIRED_MESSAGE}
        return {"allowed": True, "reason": ""}
    
    async def get_daily_lesson_count(self, email: str) -> int:
        """今日のレッスン使用数を取得"""
        try:
            response = self.client.databases.query(
                database_id=self.user_db_id,
                filter={
                    "property": "Email",
                    "rich_text": {
                        "equals": email
                    }
                }
            )
            
            if not response.get("results"):
                return 0
            
            user = response["results"][0]
            props = user["properties"]
            
            # 最後にレッスンを使った日を取得
            last_lesson_date = props.get("Last Lesson Date", {}).get("date", {})
            if not last_lesson_date or not last_lesson_date.get("start"):
                return 0
            
            # 今日の日付と比較
            last_date = datetime.fromisoformat(last_lesson_date["start"].replace("Z", "+00:00"))
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            
            # 今日でない場合は0を返す
            if last_date.date() != today.date():
                return 0
            
            # 今日のレッスン数を取得
            daily_count = props.get("Daily Lessons Count", {}).get("number")
            return int(daily_count) if daily_count is not None else 0
        except Exception as e:
            logger.error(f"Error getting daily lesson count: {e}")
            return 0
    
    async def can_use_lesson(self, email: str) -> Dict:
        """
        レッスン使用可能かチェック（体験期間中・有料プランは制限なし。体験終了後は使用不可）
        
        Returns:
            {
                "allowed": bool,
                "reason": str,
                "remaining_lessons": int
            }
        """
        access = await self.check_access(email)
        # 体験期間中・有料プランともに、1日あたりのレッスン数の制限はなし
        return {
            "allowed": access["allowed"],
            "reason": access["reason"],
            "remaining_lessons": None
        }
    
    async def add_lesson_usage(self, email: str):
        """レッスン使用を記録"""
        try:
            response = self.client.databases.query(
                database_id=self.user_db_id,
                filter={
                    "property": "Email",
                    "rich_text": {
                        "equals": email
                    }
                }
            )
            
            if not response.get("results"):
                logger.warning(f"User not found: {email}")
                return
            
            user_id = response["results"][0]["id"]
            props = response["results"][0]["properties"]
            
            # 最後にレッスンを使った日を取得
            last_lesson_date = props.get("Last Lesson Date", {}).get("date", {})
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            
            # 今日の日付かチェック
            if last_lesson_date and last_lesson_date.get("start"):
                last_date = datetime.fromisoformat(last_lesson_date["start"].replace("Z", "+00:00"))
                if last_date.date() == today.date():
                    # 今日の場合はカウントを増やす
                    current_count = props.get("Daily Lessons Count", {}).get("number", 0) or 0
                    new_count = current_count + 1
                else:
                    # 今日でない場合は1にリセット
                    new_count = 1
            else:
                # 初回使用
                new_count = 1
            
            update_props = {
                "Daily Lessons Count": {"number": new_count},
                "Last Lesson Date": {"date": {"start": today.isoformat()}}
            }
            
            self.client.pages.update(
                page_id=user_id,
                properties=update_props
            )
            
            logger.info(f"Updated lesson usage for {email}: {new_count} lessons today")
        except Exception as e:
            logger.error(f"Error adding lesson usage: {e}")
            # エラーでも続行（使用量記録は重要だが、レッスン生成は続行可能）
    
    async def get_daily_ai_messages_count(self, email: str) -> int:
        """今日のAIコーチングメッセージ使用数を取得"""
        try:
            response = self.client.databases.query(
                database_id=self.user_db_id,
                filter={
                    "property": "Email",
                    "rich_text": {
                        "equals": email
                    }
                }
            )
            
            if not response.get("results"):
                return 0
            
            user = response["results"][0]
            props = user["properties"]
            
            # 最後にAIコーチングを使った日を取得
            last_ai_date = props.get("Last AI Message Date", {}).get("date", {})
            if not last_ai_date or not last_ai_date.get("start"):
                return 0
            
            # 今日の日付と比較
            last_date = datetime.fromisoformat(last_ai_date["start"].replace("Z", "+00:00"))
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            
            # 今日でない場合は0を返す
            if last_date.date() != today.date():
                return 0
            
            # 今日のメッセージ数を取得
            daily_count = props.get("Daily AI Messages Count", {}).get("number")
            return int(daily_count) if daily_count is not None else 0
        except Exception as e:
            logger.error(f"Error getting daily AI messages count: {e}")
            return 0
    
    async def can_use_ai_chat(self, email: str) -> Dict:
        """
        AIコーチング使用可能かチェック（体験期間中・有料プランは制限なし。体験終了後は使用不可）
        
        Returns:
            {
                "allowed": bool,
                "reason": str,
                "remaining_messages": int
            }
        """
        access = await self.check_access(email)
        # 体験期間中はメッセージ数の制限なし。Basicの月100メッセージは、従来どおり未実装(Premiumと同じ扱い)
        return {
            "allowed": access["allowed"],
            "reason": access["reason"],
            "remaining_messages": None
        }
    
    async def add_ai_chat_usage(self, email: str):
        """AIコーチングメッセージ使用を記録"""
        try:
            response = self.client.databases.query(
                database_id=self.user_db_id,
                filter={
                    "property": "Email",
                    "rich_text": {
                        "equals": email
                    }
                }
            )
            
            if not response.get("results"):
                logger.warning(f"User not found: {email}")
                return
            
            user_id = response["results"][0]["id"]
            props = response["results"][0]["properties"]
            
            # 最後にAIコーチングを使った日を取得
            last_ai_date = props.get("Last AI Message Date", {}).get("date", {})
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            
            # 今日の日付かチェック
            if last_ai_date and last_ai_date.get("start"):
                last_date = datetime.fromisoformat(last_ai_date["start"].replace("Z", "+00:00"))
                if last_date.date() == today.date():
                    # 今日の場合はカウントを増やす
                    current_count = props.get("Daily AI Messages Count", {}).get("number", 0) or 0
                    new_count = current_count + 1
                else:
                    # 今日でない場合は1にリセット
                    new_count = 1
            else:
                # 初回使用
                new_count = 1
            
            update_props = {
                "Daily AI Messages Count": {"number": new_count},
                "Last AI Message Date": {"date": {"start": today.isoformat()}}
            }
            
            self.client.pages.update(
                page_id=user_id,
                properties=update_props
            )
            
            logger.info(f"Updated AI chat usage for {email}: {new_count} messages today")
        except Exception as e:
            logger.error(f"Error adding AI chat usage: {e}")
            # エラーでも続行（使用量記録は重要だが、チャットは続行可能）
