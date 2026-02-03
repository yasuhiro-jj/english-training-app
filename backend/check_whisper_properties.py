"""
Whisper使用量管理のためのNotionプロパティ確認スクリプト
"""
import os
from notion_client import Client
from dotenv import load_dotenv

load_dotenv()

def check_whisper_properties():
    """Notion Usersデータベースに必要なWhisperプロパティが存在するか確認"""
    
    token = os.getenv("NOTION_TOKEN")
    user_db_id = os.getenv("NOTION_USER_DATABASE_ID")
    
    if not token:
        print("❌ ERROR: NOTION_TOKENが設定されていません")
        return False
    
    if not user_db_id:
        print("❌ ERROR: NOTION_USER_DATABASE_IDが設定されていません")
        return False
    
    try:
        client = Client(auth=token)
        
        # データベースのプロパティを取得
        db = client.databases.retrieve(database_id=user_db_id)
        properties = db.get("properties", {})
        
        print("=" * 60)
        print("Whisperプロパティ確認")
        print("=" * 60)
        print(f"データベースID: {user_db_id[:20]}...")
        print()
        
        # 必要なプロパティの定義
        required_properties = {
            "Whisper Usage Minutes (This Month)": "number",
            "Whisper Usage Minutes (Total)": "number",
            "Last Whisper Usage Date": "date",
        }
        
        # オプショナルなプロパティ（サブスクリプション関連）
        optional_properties = {
            "Subscription Plan": "select",
            "Subscription Status": "select",
            "Trial Ends At": "date",
        }
        
        all_ok = True
        
        # 必須プロパティの確認
        print("📋 必須プロパティ:")
        for prop_name, expected_type in required_properties.items():
            if prop_name in properties:
                prop = properties[prop_name]
                actual_type = prop.get("type", "")
                
                if actual_type == expected_type:
                    print(f"  ✅ {prop_name} ({actual_type})")
                else:
                    print(f"  ❌ {prop_name}")
                    print(f"     期待: {expected_type}, 実際: {actual_type}")
                    all_ok = False
            else:
                print(f"  ❌ {prop_name} - プロパティが見つかりません")
                all_ok = False
        
        print()
        
        # オプショナルプロパティの確認
        print("📋 オプショナルプロパティ（サブスクリプション関連）:")
        for prop_name, expected_type in optional_properties.items():
            if prop_name in properties:
                prop = properties[prop_name]
                actual_type = prop.get("type", "")
                
                if actual_type == expected_type:
                    print(f"  ✅ {prop_name} ({actual_type})")
                else:
                    print(f"  ⚠️  {prop_name} - タイプが異なります")
                    print(f"     期待: {expected_type}, 実際: {actual_type}")
            else:
                print(f"  ⚠️  {prop_name} - プロパティが見つかりません（オプション）")
        
        print()
        print("=" * 60)
        
        if all_ok:
            print("✅ すべての必須プロパティが正しく設定されています！")
            return True
        else:
            print("❌ 一部のプロパティが不足しているか、タイプが正しくありません")
            print()
            print("📝 設定方法:")
            print("   WHISPER_NOTION_SETUP.md を参照してください")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    check_whisper_properties()
