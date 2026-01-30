# 🇬🇧 English Conversation Training App (RareJob Edition)

**中級者以上向け・実践的な英会話トレーニングアプリ（MVP完成版）**

---

## 📖 概要

このアプリは、RareJob DNAの記事を使って英語で話す練習をし、**会話中は一切止めず**、終了後にのみ文法・語彙のフィードバックをNotionに記録するシステムです。

### 特徴
- ✅ 会話を止めない（訂正は後で）
- ✅ AIが記事に基づいた質問を生成
- ✅ 音声認識で自動テキスト化
- ✅ フィードバックをNotionに蓄積
- ✅ 完全日本語UI

---

## 🚀 クイックスタート

### 前提条件
- Python 3.8以上
- Node.js 18以上
- OpenAI API Key
- Notion Integration Token
- Notion Database（2つ作成済み）

### セットアップ手順

#### 1. Notionデータベース作成
`notion_db_setup_instructions.md` を参照してデータベースを作成してください。

#### 2. バックエンド起動
```powershell
cd backend
pip install -r requirements.txt
# .env.example をコピーして .env を作成し、APIキーを設定
python main.py
```

#### 3. フロントエンド起動
```powershell
cd frontend
npm install
# .env.example をコピーして .env.local を作成
npm run dev
```

#### 4. アクセス
- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8000/docs

---

## � 環境変数設定

### Backend（`.env`）
```bash
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Notion Integration
NOTION_TOKEN=your_notion_integration_token_here
NOTION_CONVERSATION_DB_ID=your_conversation_db_id
NOTION_FEEDBACK_DB_ID=your_feedback_db_id
```

### Frontend（`.env.local`）
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## �📁 プロジェクト構造

```
english app/
├── backend/          # FastAPI (Python)
├── frontend/         # Next.js (TypeScript)
├── notion_schema.json
├── notion_db_setup_instructions.md
└── README.md
```

詳細なセットアップ手順は各フォルダの `README.md` / `SETUP.md` を参照してください。

---

## 🎯 使い方

1. **記事URLを入力**: RareJob DNAの記事URLを入力
2. **質問を確認**: AIが生成した質問を読む
3. **英語で回答**: 録音ボタンを押して自由に話す
4. **フィードバック確認**: Notionに保存された改善点を確認

---

## 🛠️ 技術スタック

### バックエンド
- FastAPI
- OpenAI API (GPT-4o-mini)
- Notion API
- BeautifulSoup (記事スクレイピング)

### フロントエンド
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Web Speech API

---

## 📚 ドキュメント

- [バックエンド詳細](backend/README.md)
- [フロントエンド詳細](frontend/SETUP.md)
- [Notion設定手順](notion_db_setup_instructions.md)
- [完成ウォークスルー](.gemini/antigravity/brain/.../walkthrough.md)

---

## ⚠️ 注意事項

- 音声認識は **Chrome/Edge** でのみ動作します
- マイクの許可が必要です
- バックエンドとフロントエンドを**両方起動**してください

---

## 📝 ライセンス

個人利用のMVPプロジェクトです。

---

## 🎉 完成！

すべての機能が実装され、動作確認可能な状態です。
詳細なテスト手順は `walkthrough.md` を参照してください。
