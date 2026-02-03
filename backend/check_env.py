"""
環境変数の確認スクリプト
Whisper実装に必要な環境変数が設定されているか確認します
"""
import os
from dotenv import load_dotenv

load_dotenv()

def check_environment_variables():
    """必要な環境変数が設定されているか確認"""
    
    print("=" * 60)
    print("環境変数確認")
    print("=" * 60)
    print()
    
    # 必須環境変数の定義
    required_vars = {
        "OPENAI_API_KEY": {
            "description": "OpenAI API Key（Whisper API用）",
            "required": True,
            "mask": True,  # 値をマスク表示
        },
        "NOTION_TOKEN": {
            "description": "Notion Integration Token",
            "required": True,
            "mask": True,
        },
        "NOTION_USER_DATABASE_ID": {
            "description": "Notion UsersデータベースID",
            "required": True,
            "mask": False,
        },
    }
    
    # オプショナル環境変数
    optional_vars = {
        "NOTION_CONVERSATION_DB_ID": {
            "description": "Notion Conversation LogsデータベースID",
            "required": False,
        },
        "NOTION_FEEDBACK_DB_ID": {
            "description": "Notion Feedback LogsデータベースID",
            "required": False,
        },
        "NOTION_LESSONS_DB_ID": {
            "description": "Notion LessonsデータベースID",
            "required": False,
        },
        "JWT_SECRET_KEY": {
            "description": "JWT認証用のシークレットキー",
            "required": False,
        },
        "PORT": {
            "description": "サーバーポート（デフォルト: 8000）",
            "required": False,
        },
        "ALLOWED_ORIGINS": {
            "description": "CORS許可オリジン",
            "required": False,
        },
    }
    
    all_ok = True
    
    # 必須環境変数の確認
    print("📋 必須環境変数:")
    for var_name, var_info in required_vars.items():
        value = os.getenv(var_name)
        
        if value:
            if var_info.get("mask"):
                # 値をマスク表示（最初の4文字と最後の4文字のみ表示）
                masked_value = value[:4] + "*" * (len(value) - 8) + value[-4:] if len(value) > 8 else "*" * len(value)
                print(f"  ✅ {var_name}: {masked_value}")
            else:
                # 最初の20文字のみ表示
                display_value = value[:20] + "..." if len(value) > 20 else value
                print(f"  ✅ {var_name}: {display_value}")
        else:
            print(f"  ❌ {var_name}: 設定されていません")
            print(f"     説明: {var_info['description']}")
            all_ok = False
    
    print()
    
    # オプショナル環境変数の確認
    print("📋 オプショナル環境変数:")
    for var_name, var_info in optional_vars.items():
        value = os.getenv(var_name)
        
        if value:
            if len(value) > 20:
                display_value = value[:20] + "..."
            else:
                display_value = value
            print(f"  ✅ {var_name}: {display_value}")
        else:
            print(f"  ⚠️  {var_name}: 設定されていません（オプション）")
            print(f"     説明: {var_info['description']}")
    
    print()
    print("=" * 60)
    
    # OpenAI API Keyの形式確認
    if os.getenv("OPENAI_API_KEY"):
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key.startswith("sk-"):
            print("✅ OpenAI API Keyの形式が正しいようです")
        else:
            print("⚠️  OpenAI API Keyの形式が正しくない可能性があります（通常は 'sk-' で始まります）")
    
    print()
    
    if all_ok:
        print("✅ すべての必須環境変数が設定されています！")
        print()
        print("次のステップ:")
        print("  1. python check_whisper_properties.py を実行してNotionプロパティを確認")
        print("  2. python test_whisper_api.py を実行してWhisper APIをテスト")
        return True
    else:
        print("❌ 一部の必須環境変数が設定されていません")
        print()
        print("📝 設定方法:")
        print("  backend/.env ファイルに必要な環境変数を追加してください")
        print("  例: backend/.env.example を参考にしてください")
        return False

if __name__ == "__main__":
    check_environment_variables()
