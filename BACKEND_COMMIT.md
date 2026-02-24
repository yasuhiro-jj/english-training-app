# 🚀 バックエンド変更のコミット & プッシュ手順

## 📋 バックエンド関連の変更ファイル

### 変更されたファイル
- `backend/.env.example` - OpenAI API Keyの説明追加
- `backend/app/models/schemas.py` - WhisperTranscribeRequest/Responseスキーマ追加
- `backend/main.py` - Whisperルーター追加

### 新規追加ファイル
- `backend/app/routes/whisper.py` - Whisper APIエンドポイント
- `backend/app/services/whisper_service.py` - WhisperService実装
- `backend/app/services/usage_service.py` - UsageService実装
- `backend/check_env.py` - 環境変数確認スクリプト
- `backend/check_whisper_properties.py` - Notionプロパティ確認スクリプト
- `backend/test_whisper_api.py` - Whisper APIテストスクリプト

---

## 🔧 実行手順

### ステップ1: バックエンド関連ファイルをステージング

```bash
# バックエンドの変更ファイルと新規ファイルを追加
git add backend/.env.example
git add backend/app/models/schemas.py
git add backend/main.py
git add backend/app/routes/whisper.py
git add backend/app/services/whisper_service.py
git add backend/app/services/usage_service.py
git add backend/check_env.py
git add backend/check_whisper_properties.py
git add backend/test_whisper_api.py
```

または、一度に追加：

```bash
git add backend/
```

### ステップ2: コミット

```bash
git commit -m "feat(backend): Whisper API統合実装

- WhisperService: OpenAI Whisper API統合
- UsageService: 使用量追跡と制限チェック（無料体験20分制限）
- /api/whisper/transcribe エンドポイント追加
- スキーマ追加 (WhisperTranscribeRequest/Response)
- テスト・確認ツール追加
  - check_env.py: 環境変数確認
  - check_whisper_properties.py: Notionプロパティ確認
  - test_whisper_api.py: Whisper APIテスト

テスト結果: ✅ すべて成功"
```

### ステップ3: プッシュ

```bash
git push origin main
```

---

## 📝 コミット前の確認

```bash
# ステージングされたファイルを確認
git status

# 変更内容を確認（オプション）
git diff --cached backend/
```

問題がなければ、コミットとpushを実行してください！
