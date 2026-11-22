from notion_client import Client
import os
from datetime import datetime, timedelta
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class UsageService:
    """Whisper使用量追跡サービス"""
    
    def __init__(self):
        self.client = Client(auth=os.getenv("NOTION_TOKEN"))
        self.user_db_id = os.getenv("NOTION_USER_DATABASE_ID")
    
    async def get_user_subscription_status(self, email: str) -> Dict:
        """
        ユーザーのサブスクリプション状態を取得
        
        重要: 自動課金は一切発生しません。
        体験期間終了後は、ユーザーが明示的にプランを選択するまで
        statusが"expired"として扱われ、サービスが制限されます。
        
        Returns:
            {
                "plan": "free" | "basic" | "premium",
                "status": "trial" | "active" | "expired",
                "trial_ends_at": Optional[datetime],
                "is_trial": bool
            }
        """
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
            
            # 無料体験終了日を取得
            trial_ends_at = None
            trial_date = props.get("Trial Ends At", {}).get("date", {})
            if trial_date and trial_date.get("start"):
                try:
                    trial_ends_at = datetime.fromisoformat(trial_date["start"].replace("Z", "+00:00"))
                except:
                    pass
            
            # Trial Ends At が未設定の場合は、登録日（CreatedAt）の7日後を体験終了日とする
            if trial_ends_at is None:
                created_date = props.get("CreatedAt", {}).get("date", {})
                if created_date and created_date.get("start"):
                    try:
                        created_at = datetime.fromisoformat(created_date["start"].replace("Z", "+00:00"))
                        trial_ends_at = created_at + timedelta(days=7)
                    except:
                        pass

            # 無料体験中かどうかを判定
            is_trial = status == "trial" or (plan == "free" and status != "expired")
            
            # 無料体験が期限切れかチェック
            if is_trial and trial_ends_at:
                if datetime.now() > trial_ends_at:
                    is_trial = False
                    status = "expired"
            
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
        subscription = await self.get_user_subscription_status(email)
        status = subscription.get("status", "trial")
        plan = subscription.get("plan", "free")
        
        # 体験期間終了後、まだ有料プランに登録していない場合
        if status == "expired" and plan == "free":
            return {
                "allowed": False,
                "reason": "体験期間が終了しました。有料プランへのご登録をお願いいたします。自動課金は一切発生しません。",
                "remaining_minutes": 0.0,
                "should_fallback_to_stt": False
            }
        
        # 無料体験中（7日間）はフル機能のため無制限。有料プランも無制限。
        # 体験終了後（expired）は上の分岐でブロックされる（閲覧のみ）。
        return {
            "allowed": True,
            "reason": "",
            "remaining_minutes": None,
            "should_fallback_to_stt": False
        }

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
        レッスン使用可能かチェック（無料体験7日間はフル機能・無制限、終了後は利用不可）
        
        Returns:
            {
                "allowed": bool,
                "reason": str,
                "remaining_lessons": int
            }
        """
        subscription = await self.get_user_subscription_status(email)
        status = subscription.get("status", "trial")
        plan = subscription.get("plan", "free")

        # 体験期間終了後、まだ有料プランに登録していない場合は利用不可（閲覧のみ）
        if status == "expired" and plan == "free":
            return {
                "allowed": False,
                "reason": "体験期間が終了しました。有料プランへのご登録をお願いいたします。自動課金は一切発生しません。",
                "remaining_lessons": 0
            }

        # 無料体験中（7日間）はフル機能のため無制限。有料プランも無制限。
        return {
            "allowed": True,
            "reason": "",
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
        AIコーチング使用可能かチェック（無料体験7日間はフル機能・無制限、終了後は利用不可）
        
        Returns:
            {
                "allowed": bool,
                "reason": str,
                "remaining_messages": int
            }
        """
        subscription = await self.get_user_subscription_status(email)
        status = subscription.get("status", "trial")
        plan = subscription.get("plan", "free")

        # 体験期間終了後、まだ有料プランに登録していない場合は利用不可（閲覧のみ）
        if status == "expired" and plan == "free":
            return {
                "allowed": False,
                "reason": "体験期間が終了しました。有料プランへのご登録をお願いいたします。自動課金は一切発生しません。",
                "remaining_messages": 0
            }
        
        # 有料プランは無制限（Premium）または月間制限（Basic）
        if not subscription["is_trial"]:
            plan = subscription.get("plan", "free")
            if plan == "premium":
                return {
                    "allowed": True,
                    "reason": "",
                    "remaining_messages": None
                }
            # Basicプランは100メッセージ/月（実装は後で追加可能）
            return {
                "allowed": True,
                "reason": "",
                "remaining_messages": None
            }
        
        # 無料体験中（7日間）はフル機能のため無制限
        return {
            "allowed": True,
            "reason": "",
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
