from notion_client import Client
from datetime import datetime
import os
from typing import List, Dict
import re


class NotionService:
    """Notion API連携サービス"""
    
    def __init__(self):
        self.client = Client(auth=os.getenv("NOTION_TOKEN"))
        self.conversation_db_id = os.getenv("NOTION_CONVERSATION_DB_ID")
        self.feedback_db_id = os.getenv("NOTION_FEEDBACK_DB_ID")
    
    def _normalize_date(self, date_str: str) -> str:
        """
        日付文字列をYYYY-MM-DD形式に正規化（時間部分を削除）
        """
        if not date_str:
            return None
        
        # YYYY-MM-DD形式にマッチ（時間部分があれば削除）
        match = re.match(r'(\d{4}-\d{2}-\d{2})', date_str)
        if match:
            return match.group(1)
        
        # その他の形式を試す
        try:
            # ISO形式の日時から日付部分を抽出
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return dt.strftime('%Y-%m-%d')
        except:
            # パースできない場合はそのまま返す（エラーになる可能性がある）
            return date_str
    
    def create_conversation_log(
        self,
        topic: str,
        article_url: str,
        full_transcript: str,
        duration_seconds: int,
        user_email: str = "",
        lesson_title: str = None,
        lesson_category: str = None,
        lesson_level: str = None,
        lesson_date: str = None
    ) -> str:
        """会話ログをNotionに保存"""
        try:
            properties = {
                "Topic": {
                    "title": [{"text": {"content": topic}}]
                },
                "Date": {
                    "date": {"start": datetime.now().isoformat()}
                },
                "ArticleURL": {
                    "url": article_url
                },
                "FullTranscript": {
                    "rich_text": [{"text": {"content": full_transcript}}]
                },
                "DurationSeconds": {
                    "number": duration_seconds
                },
                "UserEmail": {
                    "rich_text": [{"text": {"content": user_email}}]
                }
            }
            
            # レッスン情報を追加（存在する場合のみ）
            if lesson_title:
                properties["LessonTitle"] = {
                    "rich_text": [{"text": {"content": lesson_title}}]
                }
            if lesson_category:
                properties["LessonCategory"] = {
                    "select": {"name": lesson_category}
                }
            if lesson_level:
                properties["LessonLevel"] = {
                    "select": {"name": lesson_level}
                }
            if lesson_date:
                # 日付を正規化（YYYY-MM-DD形式、時間部分なし）
                normalized_date = self._normalize_date(lesson_date)
                if normalized_date:
                    properties["LessonDate"] = {
                        "date": {"start": normalized_date}
                    }
                else:
                    # 日付パースに失敗した場合はrich_textとして保存
                    properties["LessonDate"] = {
                        "rich_text": [{"text": {"content": lesson_date}}]
                    }
            
            response = self.client.pages.create(
                parent={"database_id": self.conversation_db_id},
                properties=properties
            )
            return response["id"]
        except Exception as e:
            print(f"Error creating conversation log: {e}")
            raise
    
    def create_feedback_item(
        self,
        original_sentence: str,
        corrected_sentence: str,
        category: str,
        reason: str,
        session_id: str,
        user_email: str = "",
        lesson_title: str = None,
        lesson_category: str = None,
        lesson_level: str = None,
        lesson_date: str = None
    ) -> str:
        """フィードバック項目をNotionに保存"""
        try:
            properties = {
                "OriginalSentence": {
                    "title": [{"text": {"content": original_sentence}}]
                },
                "CorrectedSentence": {
                    "rich_text": [{"text": {"content": corrected_sentence}}]
                },
                "Category": {
                    "select": {"name": category}
                },
                "Reason": {
                    "rich_text": [{"text": {"content": reason}}]
                },
                "Status": {
                    "select": {"name": "New"}
                },
                "SessionID": {
                    "rich_text": [{"text": {"content": session_id}}]
                },
                "UserEmail": {
                    "rich_text": [{"text": {"content": user_email}}]
                }
            }
            
            # レッスン情報を追加（存在する場合のみ）
            if lesson_title:
                properties["LessonTitle"] = {
                    "rich_text": [{"text": {"content": lesson_title}}]
                }
            if lesson_category:
                properties["LessonCategory"] = {
                    "select": {"name": lesson_category}
                }
            if lesson_level:
                properties["LessonLevel"] = {
                    "select": {"name": lesson_level}
                }
            if lesson_date:
                # 日付を正規化（YYYY-MM-DD形式、時間部分なし）
                normalized_date = self._normalize_date(lesson_date)
                if normalized_date:
                    properties["LessonDate"] = {
                        "date": {"start": normalized_date}
                    }
                else:
                    # 日付パースに失敗した場合はrich_textとして保存
                    properties["LessonDate"] = {
                        "rich_text": [{"text": {"content": lesson_date}}]
                    }
            
            response = self.client.pages.create(
                parent={"database_id": self.feedback_db_id},
                properties=properties
            )
            return response["id"]
        except Exception as e:
            print(f"Error creating feedback item: {e}")
            raise
    
    def create_multiple_feedback_items(
        self,
        feedback_items: List[Dict],
        session_id: str,
        user_email: str = "",
        lesson_title: str = None,
        lesson_category: str = None,
        lesson_level: str = None,
        lesson_date: str = None
    ) -> List[str]:
        """複数のフィードバック項目を一括保存"""
        created_ids = []
        for item in feedback_items:
            try:
                page_id = self.create_feedback_item(
                    original_sentence=item["original_sentence"],
                    corrected_sentence=item["corrected_sentence"],
                    category=item["category"],
                    reason=item["reason"],
                    session_id=session_id,
                    user_email=user_email,
                    lesson_title=lesson_title,
                    lesson_category=lesson_category,
                    lesson_level=lesson_level,
                    lesson_date=lesson_date
                )
                created_ids.append(page_id)
            except Exception as e:
                print(f"Error creating feedback item: {e}")
                continue
        
        return created_ids
    
    def get_recent_feedback(self, email: str = None, limit: int = 10) -> List[Dict]:
        """最近のフィードバックを取得"""
        try:
            query_filter = None
            if email:
                query_filter = {
                    "property": "UserEmail",
                    "rich_text": {
                        "equals": email
                    }
                }

            response = self.client.databases.query(
                database_id=self.feedback_db_id,
                filter=query_filter,
                sorts=[{"timestamp": "created_time", "direction": "descending"}],
                page_size=limit
            )
            
            feedback_list = []
            for page in response["results"]:
                props = page["properties"]
                feedback_list.append({
                    "original_sentence": props["OriginalSentence"]["title"][0]["text"]["content"] if props["OriginalSentence"]["title"] else "",
                    "corrected_sentence": props["CorrectedSentence"]["rich_text"][0]["text"]["content"] if props["CorrectedSentence"]["rich_text"] else "",
                    "category": props["Category"]["select"]["name"] if props["Category"]["select"] else "",
                    "reason": props["Reason"]["rich_text"][0]["text"]["content"] if props["Reason"]["rich_text"] else "",
                    "status": props["Status"]["select"]["name"] if props["Status"]["select"] else ""
                })
            
            return feedback_list
        except Exception as e:
            print(f"Error getting recent feedback: {e}")
            return []

    def get_user_stats(self, email: str) -> Dict:
        """ユーザーの学習統計（回数、時間など）を取得"""
        try:
            response = self.client.databases.query(
                database_id=self.conversation_db_id,
                filter={
                    "property": "UserEmail",
                    "rich_text": {
                        "equals": email
                    }
                }
            )
            
            results = response.get("results", [])
            total_sessions = len(results)
            total_duration = sum(page["properties"]["DurationSeconds"]["number"] or 0 for page in results if "DurationSeconds" in page["properties"])
            
            return {
                "total_sessions": total_sessions,
                "total_duration_minutes": round(total_duration / 60, 1),
                "last_active": results[0]["properties"]["Date"]["date"]["start"] if results else None
            }
        except Exception as e:
            print(f"Error getting user stats: {e}")
            return {"total_sessions": 0, "total_duration_minutes": 0}

    def get_frequent_mistakes(self, email: str, limit: int = 5) -> List[Dict]:
        """頻出するミスのカテゴリと傾向を取得"""
        try:
            response = self.client.databases.query(
                database_id=self.feedback_db_id,
                filter={
                    "property": "UserEmail",
                    "rich_text": {
                        "equals": email
                    }
                }
            )
            
            results = response.get("results", [])
            categories = {}
            for page in results:
                cat = page["properties"]["Category"]["select"]["name"]
                categories[cat] = categories.get(cat, 0) + 1
            
            # ソートして上位を返す
            sorted_cats = sorted(categories.items(), key=lambda x: x[1], reverse=True)
            return [{"category": k, "count": v} for k, v in sorted_cats[:limit]]
        except Exception as e:
            print(f"Error getting frequent mistakes: {e}")
            return []
