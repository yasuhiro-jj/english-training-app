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
        # データベースIDからハイフンを削除（Notion APIではハイフンなしの形式が必要）
        lessons_db_id_raw = os.getenv("NOTION_LESSONS_DB_ID", "")
        self.lessons_db_id = lessons_db_id_raw.replace("-", "") if lessons_db_id_raw else None
        
        # デバッグ用ログ
        if self.lessons_db_id:
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"NotionService initialized with lessons_db_id: {self.lessons_db_id[:20]}...")
        else:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning("NOTION_LESSONS_DB_ID not configured")
    
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
    
    def save_lesson(self, lesson_data: Dict, user_email: str = "", check_duplicate: bool = True) -> str:
        """生成した記事レッスンをNotionに保存
        
        Args:
            lesson_data: レッスンデータ
            user_email: ユーザーメールアドレス
            check_duplicate: 重複チェックを行うか（デフォルト: True）
        
        Returns:
            作成されたページID、または既存ページのID、またはNone
        """
        try:
            if not self.lessons_db_id:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning("NOTION_LESSONS_DB_ID not configured, skipping lesson save")
                print("Warning: NOTION_LESSONS_DB_ID not configured, skipping lesson save")
                return None
            
            lesson_title = lesson_data.get("title", "Untitled Lesson")
            
            # 重複チェック（同じタイトルとユーザーの記事が最近24時間以内に作成されているか）
            if check_duplicate:
                try:
                    # 過去24時間以内に同じタイトルの記事を検索
                    from datetime import timedelta
                    yesterday = datetime.now() - timedelta(days=1)
                    
                    existing_pages = self.client.databases.query(
                        database_id=self.lessons_db_id,
                        filter={
                            "and": [
                                {
                                    "property": "Title",
                                    "title": {
                                        "equals": lesson_title
                                    }
                                },
                                {
                                    "property": "UserEmail",
                                    "rich_text": {
                                        "equals": user_email
                                    }
                                },
                                {
                                    "property": "Date",
                                    "date": {
                                        "on_or_after": yesterday.isoformat()
                                    }
                                }
                            ]
                        },
                        page_size=1
                    )
                    
                    if existing_pages.get("results"):
                        existing_page_id = existing_pages["results"][0]["id"]
                        print(f"Duplicate lesson found, skipping save: {lesson_title}")
                        return existing_page_id
                except Exception as e:
                    print(f"Warning: Duplicate check failed, proceeding with save: {e}")
            
            # 記事内容をJSON文字列として保存（Notionの制限を考慮）
            import json
            lesson_json = json.dumps(lesson_data, ensure_ascii=False)
            
            # 内容が長すぎる場合は切り詰める
            content_preview = lesson_data.get("content", "")[:2000] if len(lesson_data.get("content", "")) > 2000 else lesson_data.get("content", "")
            
            # プロパティを構築（必須プロパティのみ）
            properties = {
                "Title": {
                    "title": [{"text": {"content": lesson_title}}]
                },
                "Date": {
                    "date": {"start": datetime.now().isoformat()}
                },
                "UserEmail": {
                    "rich_text": [{"text": {"content": user_email}}]
                },
                "Content": {
                    "rich_text": [{"text": {"content": content_preview}}]
                },
            }
            
            # オプショナルプロパティを追加（存在する場合のみ）
            if lesson_data.get("category"):
                properties["Category"] = {
                    "select": {"name": str(lesson_data.get("category"))}
                }
            
            if lesson_data.get("level"):
                properties["Level"] = {
                    "select": {"name": str(lesson_data.get("level"))}
                }
            
            if lesson_data.get("japanese_title"):
                properties["JapaneseTitle"] = {
                    "rich_text": [{"text": {"content": str(lesson_data.get("japanese_title"))}}]
                }
            
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Creating Notion page with properties: {list(properties.keys())}")
            logger.info(f"Database ID: {self.lessons_db_id}")
            logger.info(f"Lesson title: {lesson_title}")
            logger.info(f"User email: {user_email}")
            
            # フルデータをJSONとして保存（Notionページの本文に保存する方法も検討可能）
            try:
                logger.info("Calling Notion API: pages.create")
                response = self.client.pages.create(
                    parent={"database_id": self.lessons_db_id},
                    properties=properties
                )
                logger.info(f"Notion API response received: {response.get('id', 'NO_ID')}")
                
                # ページの本文にJSONデータを追加（オプション）
                # Notionの制限（2000文字）を考慮して、長い場合は分割またはスキップ
                try:
                    logger.info(f"Appending JSON to page: {response['id']}")
                    
                    # JSONデータが2000文字を超える場合は、複数のブロックに分割
                    max_chunk_size = 1900  # 安全マージンを考慮
                    if len(lesson_json) <= max_chunk_size:
                        # 短い場合はそのまま保存
                        self.client.blocks.children.append(
                            block_id=response["id"],
                            children=[
                                {
                                    "object": "block",
                                    "type": "code",
                                    "code": {
                                        "rich_text": [{"type": "text", "text": {"content": lesson_json}}],
                                        "language": "json"
                                    }
                                }
                            ]
                        )
                        logger.info("JSON appended successfully")
                    else:
                        # 長い場合は最初の部分のみ保存し、残りは省略
                        truncated_json = lesson_json[:max_chunk_size] + "\n... (truncated, full data available in properties)"
                        self.client.blocks.children.append(
                            block_id=response["id"],
                            children=[
                                {
                                    "object": "block",
                                    "type": "code",
                                    "code": {
                                        "rich_text": [{"type": "text", "text": {"content": truncated_json}}],
                                        "language": "json"
                                    }
                                },
                                {
                                    "object": "block",
                                    "type": "paragraph",
                                    "paragraph": {
                                        "rich_text": [{
                                            "type": "text",
                                            "text": {
                                                "content": f"Note: Full JSON data ({len(lesson_json)} characters) is too long to display. Data is available in page properties."
                                            }
                                        }]
                                    }
                                }
                            ]
                        )
                        logger.info(f"JSON appended (truncated): {len(lesson_json)} chars -> {len(truncated_json)} chars")
                except Exception as e:
                    logger.warning(f"Could not append JSON to page (non-critical): {e}")
                    print(f"Warning: Could not append JSON to page: {e}")
                
                logger.info(f"Lesson saved to Notion: {lesson_title} (Page ID: {response['id']})")
                print(f"Lesson saved to Notion: {lesson_title} (Page ID: {response['id']})")
                return response["id"]
            except Exception as api_error:
                # Notion APIのエラーを詳細に記録
                error_msg = str(api_error)
                error_type = type(api_error).__name__
                logger.error(f"Notion API error ({error_type}): {error_msg}")
                
                # エラーの詳細を取得
                if hasattr(api_error, 'code'):
                    logger.error(f"Error code: {api_error.code}")
                if hasattr(api_error, 'body'):
                    logger.error(f"Error body: {api_error.body}")
                if hasattr(api_error, 'headers'):
                    logger.error(f"Error headers: {api_error.headers}")
                
                print(f"Error saving lesson to Notion: {error_type}: {error_msg}")
                import traceback
                traceback.print_exc()
                raise  # エラーを再発生させて、呼び出し元で処理できるようにする
                
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            error_msg = str(e)
            error_type = type(e).__name__
            logger.error(f"Error saving lesson to Notion ({error_type}): {error_msg}", exc_info=True)
            print(f"Error saving lesson to Notion ({error_type}): {error_msg}")
            import traceback
            traceback.print_exc()
            # エラーが発生しても処理を続行（記事生成は成功しているため）
            return None
    
    def get_user_lessons(self, user_email: str, limit: int = 50) -> List[Dict]:
        """ユーザーの過去の記事レッスンを取得"""
        try:
            if not self.lessons_db_id:
                return []
            
            response = self.client.databases.query(
                database_id=self.lessons_db_id,
                filter={
                    "property": "UserEmail",
                    "rich_text": {
                        "equals": user_email
                    }
                },
                sorts=[{"timestamp": "created_time", "direction": "descending"}],
                page_size=limit
            )
            
            lessons = []
            for page in response.get("results", []):
                props = page["properties"]
                
                # ページのブロックからJSONデータを取得を試みる
                lesson_data = None
                try:
                    blocks = self.client.blocks.children.list(block_id=page["id"])
                    for block in blocks.get("results", []):
                        if block.get("type") == "code" and block.get("code", {}).get("language") == "json":
                            import json
                            lesson_data = json.loads(block["code"]["rich_text"][0]["text"]["content"])
                            break
                except:
                    pass
                
                # JSONデータがない場合は、プロパティから再構築
                if not lesson_data:
                    lesson_data = {
                        "title": props.get("Title", {}).get("title", [{}])[0].get("text", {}).get("content", ""),
                        "category": props.get("Category", {}).get("select", {}).get("name", ""),
                        "level": props.get("Level", {}).get("select", {}).get("name", ""),
                        "content": props.get("Content", {}).get("rich_text", [{}])[0].get("text", {}).get("content", ""),
                        "japanese_title": props.get("JapaneseTitle", {}).get("rich_text", [{}])[0].get("text", {}).get("content", "") if props.get("JapaneseTitle", {}).get("rich_text") else "",
                        "date": props.get("Date", {}).get("date", {}).get("start", ""),
                    }
                
                lessons.append({
                    "id": page["id"],
                    "notion_page_id": page["id"],
                    "created_at": props.get("Date", {}).get("date", {}).get("start", ""),
                    **lesson_data
                })
            
            return lessons
        except Exception as e:
            print(f"Error getting user lessons: {e}")
            return []
