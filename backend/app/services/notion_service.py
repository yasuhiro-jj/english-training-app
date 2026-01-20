from notion_client import Client
from datetime import datetime
import os
from typing import List, Dict


class NotionService:
    """Notion API連携サービス"""
    
    def __init__(self):
        self.client = Client(auth=os.getenv("NOTION_TOKEN"))
        self.conversation_db_id = os.getenv("NOTION_CONVERSATION_DB_ID")
        self.feedback_db_id = os.getenv("NOTION_FEEDBACK_DB_ID")
    
    def create_conversation_log(
        self,
        topic: str,
        article_url: str,
        full_transcript: str,
        duration_seconds: int,
        user_email: str = ""
    ) -> str:
        """会話ログをNotionに保存"""
        try:
            response = self.client.pages.create(
                parent={"database_id": self.conversation_db_id},
                properties={
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
        user_email: str = ""
    ) -> str:
        """フィードバック項目をNotionに保存"""
        try:
            response = self.client.pages.create(
                parent={"database_id": self.feedback_db_id},
                properties={
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
            )
            return response["id"]
        except Exception as e:
            print(f"Error creating feedback item: {e}")
            raise
    
    def create_multiple_feedback_items(
        self,
        feedback_items: List[Dict],
        session_id: str,
        user_email: str = ""
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
                    user_email=user_email
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
