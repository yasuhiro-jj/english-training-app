import os
from notion_client import Client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

def report_to_notion():
    client = Client(auth=os.getenv("NOTION_TOKEN"))
    task_db_id = os.getenv("NOTION_TASK_DATABASE_ID")
    log_db_id = os.getenv("NOTION_LOG_DATABASE_ID")
    
    # 1. 完了したタスクのステータスを更新
    print("Updating task statuses in Notion...")
    try:
        tasks = client.databases.query(
            database_id=task_db_id,
            filter={
                "or": [
                    {"property": "タスク名", "rich_text": {"contains": "ログイン"}},
                    {"property": "タスク名", "rich_text": {"contains": "サインアップ"}},
                    {"property": "タスク名", "rich_text": {"contains": "認証"}},
                    {"property": "タスク名", "rich_text": {"contains": "users"}},
                    {"property": "タスク名", "rich_text": {"contains": "保護ルート"}},
                ]
            }
        ).get("results", [])
        
        for task in tasks:
            task_name = task["properties"]["タスク名"]["title"][0]["plain_text"]
            print(f"Updating task: {task_name}")
            client.pages.update(
                page_id=task["id"],
                properties={
                    "ステータス": {"select": {"name": "Done"}}
                }
            )
        print("Done updating tasks.")
    except Exception as e:
        print(f"Error updating tasks: {e}")

    # 2. 判断ログDBに報告を追加
    print("Adding log entry to Notion...")
    try:
        client.pages.create(
            parent={"database_id": log_db_id},
            properties={
                "問題タイトル": {
                    "title": [{"text": {"content": "ユーザー認証機能（Notion連携）の実装完了"}}]
                },
                "発生日": {
                    "date": {"start": datetime.now().isoformat()}
                },
                "原因": {
                    "rich_text": [{"text": {"content": "NotionをDBとして使用したJWT認証システムの実装。グラスモーフィズムUIの採用、パスワードハッシュ化(bcrypt)、middlewareによるルート保護、AuthContextによる状態管理を含む。"}}]
                },
                "解決策": {
                    "rich_text": [{"text": {"content": "1. Notion DB 'Users' を新規作成しEmail/Passwordプロパティを定義。\n2. FastAPIバックエンドでAuthServiceを実装。\n3. Next.jsフロントエンドでContext APIとMiddlewareを統合。"}}]
                },
                "カテゴリ": {
                    "select": {"name": "開発"}
                }
            }
        )
        print("Done adding log entry.")
    except Exception as e:
        print(f"Error adding log entry: {e}")

if __name__ == "__main__":
    report_to_notion()
