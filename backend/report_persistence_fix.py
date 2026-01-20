import os
from notion_client import Client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

def report_fix():
    token = os.getenv("NOTION_TOKEN")
    log_db_id = os.getenv("NOTION_LOG_DATABASE_ID")
    
    if not token or not log_db_id:
        print("Missing Notion credentials or Database ID")
        return

    client = Client(auth=token)
    
    title = "セッション維持の問題解決：ヘッダーベース認証への移行"
    reason = "Vercel(frontend)とRailway(backend)のクロスドメイン制限により、HttpOnlyクッキーがブラウザでブロックされ、ページ遷移時にログアウトが発生していた。"
    solution = "1. クッキー依存の認証から、Authorization: Bearerヘッダー+localStorage方式へ移行。\n2. フロントエンド(api.ts)にトークンを自動付与する共通フェッチャーを実装。\n3. バックエンド(deps.py)でヘッダーからのJWT抽出に対応し、既存のクッキー方式とも互換性を維持。"

    try:
        client.pages.create(
            parent={"database_id": log_db_id},
            properties={
                "問題タイトル": {
                    "title": [{"text": {"content": title}}]
                },
                "発生日": {
                    "date": {"start": datetime.now().isoformat()}
                },
                "原因": {
                    "rich_text": [{"text": {"content": reason}}]
                },
                "解決策": {
                    "rich_text": [{"text": {"content": solution}}]
                },
                "カテゴリ": {
                    "select": {"name": "開発"}
                }
            }
        )
        print(f"Successfully reported to Notion: {title}")
    except Exception as e:
        print(f"Error reporting to Notion: {e}")

if __name__ == "__main__":
    report_fix()
