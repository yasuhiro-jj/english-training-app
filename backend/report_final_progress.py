import os
from notion_client import Client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

def report_final():
    client = Client(auth=os.getenv("NOTION_TOKEN"))
    log_db_id = os.getenv("NOTION_LOG_DATABASE_ID")
    
    reports = [
        {
            "title": "英会話アプリMVP：機能実装とNotion連携の完了",
            "reason": "音声認識、AI解析、ニュース取得、Notion保存の各機能が統合され、一連の学習フローが完成。",
            "solution": "1. AIServiceによるニュース要約と質問生成の実装。\n2. Speech APIによるリアルタイムテキスト化。\n3. 解析結果をNotionのConversation Log/Feedback DBへ自動保存する機能を実装。"
        },
        {
            "title": "デプロイ環境の最適化とリポジトリ構造の修正",
            "reason": "Railwayデプロイ時のビルドエラーおよび階層構造の問題を解決。本番環境でのログイン・CORS問題を解消。",
            "solution": "1. english-training-app-cleanディレクトリへの移行とフラットなリポジトリ構造の確立。\n2. Pydantic 2.6.0へのアップグレードによるPython 3.13互換性の確保。\n3. Cross-origin認証(Samesite:None, Secure:True)およびCORS(Allowed Origins)の本番用設定適用。"
        }
    ]

    print("Reporting final progress to Notion Log DB...")
    for report in reports:
        try:
            client.pages.create(
                parent={"database_id": log_db_id},
                properties={
                    "問題タイトル": {
                        "title": [{"text": {"content": report["title"]}}]
                    },
                    "発生日": {
                        "date": {"start": datetime.now().isoformat()}
                    },
                    "原因": {
                        "rich_text": [{"text": {"content": report["reason"]}}]
                    },
                    "解決策": {
                        "rich_text": [{"text": {"content": report["solution"]}}]
                    },
                    "カテゴリ": {
                        "select": {"name": "開発"}
                    }
                }
            )
            print(f"Reported: {report['title']}")
        except Exception as e:
            print(f"Error reporting '{report['title']}': {e}")

if __name__ == "__main__":
    report_final()
