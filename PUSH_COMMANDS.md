# 🚀 Git Push コマンド集

## 📍 プロジェクトルートから実行

プロジェクトルート（`english-training-app-clean`）にいることを確認してください。

---

## 🔧 バックエンド変更をプッシュするコマンド

### ステップ1: ロックファイルの削除（必要に応じて）

```powershell
Remove-Item -Path ".git\index.lock" -Force -ErrorAction SilentlyContinue
```

### ステップ2: バックエンド関連ファイルをステージング

```bash
git add backend/.env.example backend/app/models/schemas.py backend/main.py backend/app/routes/whisper.py backend/app/services/whisper_service.py backend/app/services/usage_service.py backend/check_env.py backend/check_whisper_properties.py backend/test_whisper_api.py
```

### ステップ3: コミット

```bash
git commit -m "feat(backend): Whisper API統合実装

- WhisperService: OpenAI Whisper API統合
- UsageService: 使用量追跡と制限チェック（無料体験20分制限）
- /api/whisper/transcribe エンドポイント追加
- スキーマ追加 (WhisperTranscribeRequest/Response)
- テスト・確認ツール追加

テスト結果: ✅ すべて成功"
```

### ステップ4: プッシュ

```bash
git push origin main
```

---

## 📋 すべてのWhisper実装をプッシュする場合（バックエンド + フロントエンド + ドキュメント）

### ステップ1: ロックファイルの削除

```powershell
Remove-Item -Path ".git\index.lock" -Force -ErrorAction SilentlyContinue
```

### ステップ2: すべてのWhisper関連ファイルをステージング

```bash
git add backend/.env.example backend/app/models/schemas.py backend/main.py backend/app/routes/whisper.py backend/app/services/whisper_service.py backend/app/services/usage_service.py backend/check_env.py backend/check_whisper_properties.py backend/test_whisper_api.py frontend/components/AudioRecorder.tsx frontend/lib/api.ts frontend/app/session/page.tsx WHISPER_IMPLEMENTATION_PLAN.md WHISPER_NOTION_SETUP.md WHISPER_SETUP_COMPLETION.md WHISPER_TEST_RESULTS.md
```

### ステップ3: コミット

```bash
git commit -m "feat: Whisper API統合実装完了

- バックエンド実装（WhisperService, UsageService, APIエンドポイント）
- フロントエンド実装（MediaRecorder統合、Whisper API呼び出し）
- データベース設定（Notion Users DBプロパティ追加）
- テスト・確認ツール追加
- ドキュメント追加

テスト結果: ✅ すべて成功"
```

### ステップ4: プッシュ

```bash
git push origin main
```

---

## 🔍 確認コマンド

### ステージング前の状態確認

```bash
git status
```

### ステージング後の確認

```bash
git status
git diff --cached
```

### コミット履歴確認

```bash
git log --oneline -5
```

---

## ⚠️ 注意事項

1. **ロックファイル**: `.git/index.lock` が存在する場合は削除が必要です
2. **環境変数**: `.env` ファイルはコミットしないでください（`.env.example` のみ）
3. **確認**: プッシュ前に `git status` でステージング内容を確認してください

---

## 📝 ワンライナー（バックエンドのみ）

```bash
Remove-Item -Path ".git\index.lock" -Force -ErrorAction SilentlyContinue; git add backend/; git commit -m "feat(backend): Whisper API統合実装"; git push origin main
```

---

## 📝 ワンライナー（すべて）

```bash
Remove-Item -Path ".git\index.lock" -Force -ErrorAction SilentlyContinue; git add backend/ frontend/components/AudioRecorder.tsx frontend/lib/api.ts frontend/app/session/page.tsx WHISPER_*.md; git commit -m "feat: Whisper API統合実装完了"; git push origin main
```
