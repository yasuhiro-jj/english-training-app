# 🚀 Git Commit & Push ガイド

## 📋 Whisper実装のコミット手順

### ステップ1: .git/index.lock の削除（必要に応じて）

もし `.git/index.lock` ファイルが存在する場合、削除してください：

```bash
# PowerShellで実行
Remove-Item -Path ".git\index.lock" -Force
```

### ステップ2: ファイルをステージング

```bash
# Whisper実装関連のバックエンドファイル
git add backend/app/models/schemas.py
git add backend/app/services/whisper_service.py
git add backend/app/services/usage_service.py
git add backend/app/routes/whisper.py
git add backend/main.py
git add backend/.env.example
git add backend/check_env.py
git add backend/check_whisper_properties.py
git add backend/test_whisper_api.py

# Whisper実装関連のフロントエンドファイル
git add frontend/components/AudioRecorder.tsx
git add frontend/lib/api.ts
git add frontend/app/session/page.tsx

# Whisper実装関連のドキュメント
git add WHISPER_IMPLEMENTATION_PLAN.md
git add WHISPER_NOTION_SETUP.md
git add WHISPER_SETUP_COMPLETION.md
git add WHISPER_TEST_RESULTS.md
```

または、すべてのWhisper関連ファイルを一度に追加：

```bash
git add backend/app/models/schemas.py backend/app/services/whisper_service.py backend/app/services/usage_service.py backend/app/routes/whisper.py backend/main.py backend/.env.example backend/check_env.py backend/check_whisper_properties.py backend/test_whisper_api.py frontend/components/AudioRecorder.tsx frontend/lib/api.ts frontend/app/session/page.tsx WHISPER_IMPLEMENTATION_PLAN.md WHISPER_NOTION_SETUP.md WHISPER_SETUP_COMPLETION.md WHISPER_TEST_RESULTS.md
```

### ステップ3: コミット

```bash
git commit -m "feat: Whisper API統合実装完了

- バックエンド実装
  - WhisperService: OpenAI Whisper API統合
  - UsageService: 使用量追跡と制限チェック
  - /api/whisper/transcribe エンドポイント追加
  - スキーマ追加 (WhisperTranscribeRequest/Response)

- フロントエンド実装
  - MediaRecorder API統合
  - Whisper API呼び出し機能
  - 使用量表示とフォールバック機能
  - 自動モード切り替え（Whisper ↔ 端末STT）

- データベース設定
  - Notion Users DBにプロパティ追加完了
  - Whisper使用量トラッキング（今月・累計・最終利用日）
  - サブスクリプション関連プロパティ

- テスト・確認ツール
  - 環境変数確認スクリプト
  - Notionプロパティ確認スクリプト
  - Whisper APIテストスクリプト

- ドキュメント
  - 実装計画書
  - Notion設定ガイド
  - テスト結果記録

テスト結果: ✅ すべて成功
- Whisper API: ✅ 成功
- WhisperService: ✅ 成功
- UsageService: ✅ 成功"
```

### ステップ4: Push

```bash
git push origin main
```

---

## 📝 コミットメッセージの説明

### コミットタイプ
- `feat:` - 新機能の追加

### 実装内容
- バックエンド、フロントエンド、データベース、テスト、ドキュメントの各セクションに分けて記録

### テスト結果
- すべてのテストが成功したことを明記

---

## ⚠️ 注意事項

1. **他の変更ファイル**: `frontend/app/page.tsx` や `frontend/components/Header.tsx` など、Whisper実装とは直接関係ないファイルも変更されている場合は、別途確認してください。

2. **環境変数**: `.env` ファイルはコミットしないでください（`.env.example` のみコミット）。

3. **テスト**: コミット前に動作確認を推奨します。

---

## 🔍 コミット前の確認

```bash
# ステージングされたファイルを確認
git status

# 変更内容を確認
git diff --cached
```

問題がなければ、コミットとpushを実行してください！
