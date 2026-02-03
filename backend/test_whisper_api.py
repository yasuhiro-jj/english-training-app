"""
Whisper APIの動作確認とエラーハンドリングテスト
"""
import os
import base64
import io
import asyncio
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

async def test_whisper_api():
    """Whisper APIの動作確認"""
    
    print("=" * 60)
    print("Whisper API テスト")
    print("=" * 60)
    print()
    
    # 環境変数の確認
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ ERROR: OPENAI_API_KEYが設定されていません")
        print("   .envファイルにOPENAI_API_KEYを追加してください")
        return False
    
    try:
        client = AsyncOpenAI(api_key=api_key)
        
        # テスト用の短い音声データ（実際の音声ファイルが必要）
        # ここではダミーデータを使用（実際のテストでは音声ファイルを読み込む）
        print("📝 テスト1: Whisper API接続確認")
        print("   注意: 実際の音声ファイルが必要です")
        print()
        
        # 実際の音声ファイルがある場合のテスト
        test_audio_path = os.path.join(os.path.dirname(__file__), "test_audio.webm")
        
        if os.path.exists(test_audio_path):
            print(f"✅ テスト音声ファイルが見つかりました: {test_audio_path}")
            
            with open(test_audio_path, "rb") as f:
                audio_bytes = f.read()
            
            audio_file = io.BytesIO(audio_bytes)
            audio_file.name = "test_audio.webm"
            
            print("🔄 Whisper APIを呼び出し中...")
            response = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="en"
            )
            
            transcript = response.text
            print(f"✅ 文字起こし成功!")
            print(f"   結果: {transcript}")
            print()
            
        else:
            print("⚠️  テスト音声ファイルが見つかりません")
            print(f"   期待されるパス: {test_audio_path}")
            print("   スキップ: 実際の音声ファイルでテストしてください")
            print()
        
        # API接続テスト（音声ファイルなし）
        print("📝 テスト2: API接続確認（エラーハンドリング）")
        
        # 無効なデータでエラーハンドリングをテスト
        try:
            empty_file = io.BytesIO(b"")
            empty_file.name = "empty.webm"
            
            await client.audio.transcriptions.create(
                model="whisper-1",
                file=empty_file,
                language="en"
            )
            print("⚠️  エラーが発生するはずですが、発生しませんでした")
        except Exception as e:
            print(f"✅ エラーハンドリング正常: {type(e).__name__}")
            print(f"   メッセージ: {str(e)[:100]}...")
        
        print()
        print("=" * 60)
        print("✅ Whisper APIテスト完了")
        print()
        print("次のステップ:")
        print("  1. 実際の音声ファイルでテスト")
        print("  2. バックエンドAPIエンドポイントをテスト")
        print("  3. フロントエンドから統合テスト")
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_usage_service():
    """UsageServiceの動作確認"""
    
    print("=" * 60)
    print("UsageService テスト")
    print("=" * 60)
    print()
    
    try:
        from app.services.usage_service import UsageService
        
        usage_service = UsageService()
        
        # テスト用のメールアドレス
        test_email = "test@example.com"
        
        print(f"📝 テストメールアドレス: {test_email}")
        print()
        
        # サブスクリプション状態の取得テスト
        print("📝 テスト1: サブスクリプション状態の取得")
        subscription = await usage_service.get_user_subscription_status(test_email)
        print(f"   プラン: {subscription['plan']}")
        print(f"   ステータス: {subscription['status']}")
        print(f"   無料体験中: {subscription['is_trial']}")
        print()
        
        # 使用量取得テスト
        print("📝 テスト2: Whisper使用量の取得")
        usage = await usage_service.get_whisper_usage_this_month(test_email)
        print(f"   今月の使用量: {usage}分")
        print()
        
        # 使用可能チェックテスト
        print("📝 テスト3: Whisper使用可能チェック")
        check_result = await usage_service.can_use_whisper(test_email, 1.0)
        print(f"   使用可能: {check_result['allowed']}")
        print(f"   理由: {check_result['reason']}")
        if check_result['remaining_minutes'] is not None:
            print(f"   残り分数: {check_result['remaining_minutes']}分")
        print()
        
        print("=" * 60)
        print("✅ UsageServiceテスト完了")
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_whisper_service():
    """WhisperServiceの動作確認"""
    
    print("=" * 60)
    print("WhisperService テスト")
    print("=" * 60)
    print()
    
    try:
        from app.services.whisper_service import WhisperService
        
        whisper_service = WhisperService()
        
        if not whisper_service.client:
            print("❌ ERROR: WhisperServiceのクライアントが初期化されていません")
            print("   OPENAI_API_KEYが設定されているか確認してください")
            return False
        
        print("✅ WhisperServiceが正常に初期化されました")
        print()
        
        # 実際の音声ファイルがある場合のテスト
        test_audio_path = os.path.join(os.path.dirname(__file__), "test_audio.webm")
        
        if os.path.exists(test_audio_path):
            print(f"📝 テスト音声ファイル: {test_audio_path}")
            
            with open(test_audio_path, "rb") as f:
                audio_bytes = f.read()
            
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
            
            # 音声の長さを推定（実際の実装では正確な値を取得）
            duration_seconds = 5.0  # 仮の値
            
            print("🔄 WhisperServiceで文字起こし中...")
            result = await whisper_service.transcribe_audio_with_duration(
                audio_base64=audio_base64,
                duration_seconds=duration_seconds,
                user_email="test@example.com",
                is_trial=True
            )
            
            print(f"✅ 文字起こし成功!")
            print(f"   結果: {result['transcript'][:100]}...")
            print(f"   使用分数: {result['usage_minutes']:.2f}分")
            print()
        else:
            print("⚠️  テスト音声ファイルが見つかりません")
            print("   スキップ: 実際の音声ファイルでテストしてください")
            print()
        
        print("=" * 60)
        print("✅ WhisperServiceテスト完了")
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """すべてのテストを実行"""
    
    print()
    print("🧪 Whisper実装の動作確認テスト")
    print()
    
    results = []
    
    # 1. Whisper APIテスト
    print("=" * 60)
    result1 = await test_whisper_api()
    results.append(("Whisper API", result1))
    print()
    
    # 2. WhisperServiceテスト
    print("=" * 60)
    result2 = await test_whisper_service()
    results.append(("WhisperService", result2))
    print()
    
    # 3. UsageServiceテスト
    print("=" * 60)
    result3 = await test_usage_service()
    results.append(("UsageService", result3))
    print()
    
    # 結果サマリー
    print("=" * 60)
    print("テスト結果サマリー")
    print("=" * 60)
    
    for test_name, result in results:
        status = "✅ 成功" if result else "❌ 失敗"
        print(f"  {test_name}: {status}")
    
    print()
    
    all_passed = all(result for _, result in results)
    
    if all_passed:
        print("✅ すべてのテストが成功しました！")
    else:
        print("⚠️  一部のテストが失敗しました")
        print("   エラーメッセージを確認してください")
    
    return all_passed

if __name__ == "__main__":
    asyncio.run(main())
