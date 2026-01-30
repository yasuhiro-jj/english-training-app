# Frontend Setup Guide

## 📦 インストール手順

### 1. 依存関係のインストール

```powershell
cd frontend
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env.local` を作成：

```powershell
copy .env.example .env.local
```

内容を確認（デフォルトで問題なし）:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. 開発サーバーの起動

```powershell
npm run dev
```

ブラウザで http://localhost:3000 にアクセス

---

## 📁 プロジェクト構造

```
frontend/
├── app/
│   ├── page.tsx              # ホームページ
│   ├── session/
│   │   └── page.tsx          # セッションページ
│   └── feedback/
│       └── page.tsx          # フィードバックページ
├── components/
│   └── AudioRecorder.tsx     # 音声録音コンポーネント
└── lib/
    └── api.ts                # バックエンドAPI通信
```

---

## 🎨 機能概要

### ホームページ (`/`)
- アプリの使い方を表示
- セッション開始ボタン

### セッションページ (`/session`)
1. **記事URL入力**: RareJob DNAの記事URLを入力
2. **質問表示**: AIが生成した質問と記事要約を表示
3. **音声録音**: Web Speech APIで英語の回答を録音
4. **解析**: バックエンドに送信し、Notionに保存

### フィードバックページ (`/feedback`)
- Notionに保存された最新のフィードバックを表示
- カテゴリ別に色分け（Grammar, Vocabulary, Expression, Pronunciation）

---

## 🔧 技術スタック

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Web Speech API** (音声認識)

---

## ⚠️ 注意事項

### Web Speech API
- **Chrome/Edge** でのみ動作します（Firefox/Safariは非対応）
- **HTTPS** または **localhost** でのみ利用可能
- マイクの許可が必要です

### CORS設定
バックエンドの `main.py` で以下が設定されています：
```python
allow_origins=["http://localhost:3000"]
```
