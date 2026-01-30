# Backend Setup Guide

## 📦 インストール手順

### 1. 仮想環境の作成（推奨）

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 2. 依存関係のインストール

```powershell
pip install -r requirements.txt
```

### 3. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、以下の値を設定してください：

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxx
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxx
NOTION_CONVERSATION_DB_ID=xxxxxxxxxxxxxxxx
NOTION_FEEDBACK_DB_ID=xxxxxxxxxxxxxxxx
PORT=8000
HOST=0.0.0.0
```

### 4. サーバーの起動

```powershell
python main.py
```

または

```powershell
uvicorn main:app --reload --port 8000
```

### 5. 動作確認

ブラウザで以下にアクセス：
- **ヘルスチェック**: http://localhost:8000/health
- **API ドキュメント**: http://localhost:8000/docs

---

## 🔌 API エンドポイント

### `POST /api/session/start`
セッションを開始し、記事に基づく質問を生成

**リクエスト:**
```json
{
  "article_url": "https://www.rarejob.com/dna/...",
  "topic": "Optional topic name"
}
```

**レスポンス:**
```json
{
  "session_id": "uuid",
  "question": "質問内容",
  "article_summary": "記事の要約"
}
```

### `POST /api/session/submit`
音声テキストを送信し、解析結果をNotionに保存

**リクエスト:**
```json
{
  "session_id": "uuid",
  "transcript": "I goed to school yesterday...",
  "duration_seconds": 120
}
```

**レスポンス:**
```json
{
  "session_id": "uuid",
  "feedback_count": 3,
  "message": "3件のフィードバックを記録しました"
}
```

### `GET /api/feedback/recent?limit=10`
最近のフィードバックを取得

---

## 🧪 テスト方法

### cURLでのテスト例

```powershell
# ヘルスチェック
curl http://localhost:8000/health

# セッション開始
curl -X POST http://localhost:8000/api/session/start `
  -H "Content-Type: application/json" `
  -d '{\"article_url\": \"https://www.rarejob.com/dna/2024/12/01/...\"}'
```

---

## 📁 プロジェクト構造

```
backend/
├── main.py                 # FastAPI エントリーポイント
├── requirements.txt        # 依存関係
├── .env.example           # 環境変数テンプレート
├── .env                   # 環境変数（gitignore対象）
└── app/
    ├── models/
    │   └── schemas.py     # Pydanticモデル
    ├── services/
    │   ├── ai_service.py      # OpenAI連携
    │   ├── notion_service.py  # Notion連携
    │   └── article_service.py # 記事取得
    └── routes/
        └── session.py     # APIルート
```
