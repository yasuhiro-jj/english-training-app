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
        
        Returns:
            {
                "allowed": bool,
                "reason": str,
                "remaining_minutes": Optional[float],
                "should_fallback_to_stt": bool
            }
        """
        subscription = await self.get_user_subscription_status(email)
        
        if subscription["is_trial"]:
            # 無料体験: 20分制限
            current_usage = await self.get_whisper_usage_this_month(email)
            remaining = 20.0 - current_usage
            
            if remaining <= 0:
                return {
                    "allowed": False,
                    "reason": "無料体験のWhisper使用上限（20分）に達しました",
                    "remaining_minutes": 0.0,
                    "should_fallback_to_stt": True
                }
            
            if requested_minutes > remaining:
                return {
                    "allowed": False,
                    "reason": f"Whisper残り{remaining:.1f}分です。端末STTをご利用ください",
                    "remaining_minutes": remaining,
                    "should_fallback_to_stt": True
                }
            
            return {
                "allowed": True,
                "reason": "",
                "remaining_minutes": remaining - requested_minutes,
                "should_fallback_to_stt": False
            }
        else:
            # 有料プラン: 無制限
            return {
                "allowed": True,
                "reason": "",
                "remaining_minutes": None,
                "should_fallback_to_stt": False
            }
