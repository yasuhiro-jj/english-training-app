import os
import logging
from typing import Optional
from notion_client import Client
from datetime import datetime

logger = logging.getLogger(__name__)


class NotionFeedbackService:
    """Notionフィードバック管理サービス"""

    def __init__(self):
        self.notion_token = os.getenv("NOTION_TOKEN")
        self.notion_client = Client(auth=self.notion_token) if self.notion_token else None
        self.feedback_db_id = os.getenv("NOTION_FEEDBACK_DATABASE_ID")
        self._title_property_name: Optional[str] = None
        self._email_property_name: Optional[str] = None
        self._status_property_name: Optional[str] = None
        self.last_error: Optional[str] = None

        if not self.feedback_db_id:
            logger.warning("NOTION_FEEDBACK_DATABASE_ID not configured")
        if not self.notion_token:
            logger.warning("NOTION_TOKEN not configured")

    def _ensure_db_schema_cached(self) -> bool:
        """
        データベースのプロパティ名（title/email/select）を自動判定してキャッシュする。
        """
        if not self.notion_client or not self.feedback_db_id:
            self.last_error = "Notion client or DB ID not configured"
            return False

        if self._title_property_name:
            return True

        try:
            db = self.notion_client.databases.retrieve(database_id=self.feedback_db_id)
            props = (db or {}).get("properties", {}) or {}

            title_prop = None
            email_prop = None
            status_prop = None

            for prop_name, prop in props.items():
                prop_type = (prop or {}).get("type")
                if prop_type == "title" and not title_prop:
                    title_prop = prop_name
                elif prop_type == "email" and not email_prop:
                    email_prop = prop_name
                elif prop_type == "select" and not status_prop:
                    status_prop = prop_name

            self._title_property_name = title_prop
            self._email_property_name = email_prop
            self._status_property_name = status_prop

            if not self._title_property_name:
                self.last_error = "Notion DB has no title property"
                logger.error(self.last_error)
                return False

            return True
        except Exception as e:
            self.last_error = f"Failed to retrieve Notion DB schema: {e}"
            logger.exception(f"Failed to retrieve Notion DB schema: {e}")
            return False

    async def create_feedback(
        self, 
        feedback_content: str, 
        user_email: Optional[str] = None,
        user_name: Optional[str] = None
    ) -> bool:
        """
        Notionのフィードバックデータベースに新しいフィードバックを作成

        Args:
            feedback_content: フィードバックの内容
            user_email: ユーザーのメールアドレス（オプション）
            user_name: ユーザーの名前（オプション）

        Returns:
            True if successful, False otherwise
        """
        try:
            if not self.notion_client:
                self.last_error = "Missing NOTION_TOKEN"
                logger.error("Notion client not configured (missing NOTION_TOKEN)")
                return False
            if not self.feedback_db_id:
                self.last_error = "Missing NOTION_FEEDBACK_DATABASE_ID"
                logger.error("Notion feedback database not configured (missing NOTION_FEEDBACK_DATABASE_ID)")
                return False
            if not self._ensure_db_schema_cached():
                return False

            # タイトル用の文字列を生成
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            user_identifier = user_email or user_name or "Anonymous"
            title = f"Feedback from {user_identifier} at {timestamp}"

            # Notionページのプロパティを構築（TitleはDBスキーマから自動判定）
            properties = {
                self._title_property_name: {
                    "title": [{"text": {"content": title}}]
                }
            }

            # Emailプロパティ（DBに存在する場合のみ）
            if user_email and self._email_property_name:
                properties[self._email_property_name] = {"email": user_email}

            # Statusプロパティ（DBに存在する場合のみ）
            if self._status_property_name:
                # option名が "New" で無い場合もあるので、まずはセットしない（落ちないのを優先）
                # 必要ならDB側の既定値で運用する
                pass

            # 本文は children に入れる（DBプロパティ名に依存しない）
            children = []
            if user_name:
                children.append(
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [{"type": "text", "text": {"content": f"Name: {user_name}"}}]
                        },
                    }
                )
            if user_email:
                children.append(
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [{"type": "text", "text": {"content": f"Email: {user_email}"}}]
                        },
                    }
                )
            children.append(
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"type": "text", "text": {"content": feedback_content}}]
                    },
                }
            )

            # Notionページを作成
            created = self.notion_client.pages.create(
                parent={"database_id": self.feedback_db_id},
                properties=properties,
                children=children,
            )

            page_id = (created or {}).get("id")
            if page_id:
                self.last_error = None
                logger.info(f"✅ Created Notion feedback page: page_id={page_id}, user={user_identifier}")
                return True
            else:
                self.last_error = "Notion returned no page_id"
                logger.error("Failed to create Notion feedback page: no page_id returned")
                return False

        except Exception as e:
            self.last_error = f"Failed to create Notion feedback: {e}"
            logger.exception(f"Failed to create Notion feedback: {e}")
            return False
