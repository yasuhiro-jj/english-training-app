# 🎯 Cursor AI 実装指示書

## プロジェクト概要

**大人向け・中級者以上英会話トレーニングアプリ（自分用MVP）**

現在、レッスン生成機能の修正作業中。毎日新聞サイトのスクレイピングとDaily News Englishレッスン生成機能を完全に動作させることが目標。

---

## 現在の状況（2026-01-20時点）

### 完了している機能
- ✅ RareJob DNA記事を使った会話トレーニング機能
- ✅ 音声認識（Web Speech API）
- ✅ Notion連携（会話ログ・フィードバック保存）
- ✅ フロントエンド・バックエンドの基本構造

### 現在の課題（最優先タスク）
- ❌ **Daily News Englishレッスン生成機能が動作していない**
  - 毎日新聞サイトのスクレイピング時に403 Forbiddenエラー
  - バックエンドAPIエンドポイントのアクセス問題
  - フロントエンドからのレッスン生成フローが未完成

---

## 技術スタック

### フロントエンド
- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Web Speech API**（音声認識）

### バックエンド
- **FastAPI** (Python)
- **OpenAI API** (GPT-4o-mini)
- **Notion API**
- **BeautifulSoup** (スクレイピング)

### データベース
- **Notion Database**（RDB不使用）
  - Conversation Logs DB
  - Feedback Logs DB

---

## プロジェクト構造

```
english app/
├── backend/
│   ├── main.py              # FastAPIメインファイル
│   ├── scraper.py           # 記事スクレイピング
│   ├── notion_client.py     # Notion API連携
│   ├── requirements.txt
│   └── .env                 # 環境変数
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # トップページ
│   │   ├── chat/page.tsx    # 会話トレーニング画面
│   │   └── signup/page.tsx  # サインアップ画面
│   ├── package.json
│   └── .env.local           # 環境変数
├── 要件定義書               # 詳細な技術要件
├── README.md
└── CURSOR_INSTRUCTIONS.md   # このファイル
```

---

## 🔥 最優先タスク: Daily News Englishレッスン生成機能の修正

### 問題の詳細

#### 1. 毎日新聞スクレイピングの403エラー
- **現象**: 毎日新聞サイトにアクセスすると403 Forbidden
- **原因**: User-Agentやリファラーチェック、Cloudflare等のbot対策
- **必要な対応**:
  - User-Agentヘッダーの設定
  - リトライロジックの実装
  - 必要に応じてSelenium/Playwrightの導入検討

#### 2. バックエンドAPIエンドポイント
- **必要なエンドポイント**:
  - `POST /lesson/generate` - レッスン生成
  - `GET /lesson/{lesson_id}` - レッスン取得
  - `POST /lesson/save` - Notionへ保存

#### 3. フロントエンド実装
- レッスン生成UIの実装
- 生成されたレッスンの表示
- エラーハンドリング

---

## 実装ガイドライン

### スクレイピング実装のベストプラクティス

```python
# backend/scraper.py の修正例

import requests
from bs4 import BeautifulSoup
import time
from typing import Optional

class MainichiNewsScraper:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
            'Referer': 'https://mainichi.jp/',
        }
        self.session = requests.Session()
    
    def scrape_article(self, url: str, max_retries: int = 3) -> Optional[dict]:
        """記事をスクレイピング（リトライ機能付き）"""
        for attempt in range(max_retries):
            try:
                response = self.session.get(url, headers=self.headers, timeout=10)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # 記事タイトルと本文を抽出
                title = soup.find('h1', class_='title')
                content = soup.find('div', class_='main-text')
                
                if title and content:
                    return {
                        'title': title.get_text(strip=True),
                        'content': content.get_text(strip=True),
                        'url': url
                    }
                
            except requests.RequestException as e:
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                    continue
                raise
        
        return None
```

### FastAPI エンドポイント実装

```python
# backend/main.py に追加

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

class LessonGenerateRequest(BaseModel):
    news_url: str

class LessonResponse(BaseModel):
    lesson_id: str
    title: str
    content: str
    questions: list[str]

@app.post("/lesson/generate", response_model=LessonResponse)
async def generate_lesson(request: LessonGenerateRequest):
    """Daily News Englishレッスンを生成"""
    try:
        # 1. 記事をスクレイピング
        scraper = MainichiNewsScraper()
        article = scraper.scrape_article(request.news_url)
        
        if not article:
            raise HTTPException(status_code=400, detail="記事の取得に失敗しました")
        
        # 2. OpenAI APIで質問を生成
        questions = await generate_questions_from_article(article)
        
        # 3. Notionに保存
        lesson_id = await save_lesson_to_notion(article, questions)
        
        return LessonResponse(
            lesson_id=lesson_id,
            title=article['title'],
            content=article['content'],
            questions=questions
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### フロントエンド実装

```typescript
// frontend/app/lesson/page.tsx

'use client';

import { useState } from 'react';

export default function LessonPage() {
  const [newsUrl, setNewsUrl] = useState('');
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateLesson = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lesson/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ news_url: newsUrl }),
      });
      
      if (!response.ok) {
        throw new Error('レッスンの生成に失敗しました');
      }
      
      const data = await response.json();
      setLesson(data);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Daily News English</h1>
      
      <div className="mb-6">
        <input
          type="url"
          value={newsUrl}
          onChange={(e) => setNewsUrl(e.target.value)}
          placeholder="毎日新聞の記事URLを入力"
          className="w-full p-3 border rounded"
        />
        <button
          onClick={generateLesson}
          disabled={loading || !newsUrl}
          className="mt-4 px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '生成中...' : 'レッスンを生成'}
        </button>
      </div>
      
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded mb-4">
          {error}
        </div>
      )}
      
      {lesson && (
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-2xl font-bold mb-4">{lesson.title}</h2>
          <div className="mb-6">
            <h3 className="font-bold mb-2">記事内容:</h3>
            <p className="text-gray-700">{lesson.content}</p>
          </div>
          <div>
            <h3 className="font-bold mb-2">質問:</h3>
            <ul className="list-disc pl-6">
              {lesson.questions.map((q: string, i: number) => (
                <li key={i} className="mb-2">{q}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 環境変数

### Backend (.env)
```bash
OPENAI_API_KEY=your_openai_api_key_here
NOTION_TOKEN=your_notion_integration_token_here
NOTION_CONVERSATION_DB_ID=your_conversation_db_id
NOTION_FEEDBACK_DB_ID=your_feedback_db_id
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 開発フロー

### 1. バックエンド起動
```powershell
cd backend
python main.py
```
→ http://localhost:8000/docs でAPI確認

### 2. フロントエンド起動
```powershell
cd frontend
npm run dev
```
→ http://localhost:3000 でアプリ確認

### 3. テスト手順
1. 毎日新聞の記事URLを取得
2. フロントエンドでURLを入力
3. レッスン生成ボタンをクリック
4. 生成されたレッスンが表示されることを確認
5. Notionに保存されていることを確認

---

## デバッグのヒント

### スクレイピングエラーの場合
```python
# ログ出力を追加
import logging
logging.basicConfig(level=logging.DEBUG)

# レスポンスを確認
print(f"Status: {response.status_code}")
print(f"Headers: {response.headers}")
print(f"Content: {response.text[:500]}")
```

### API接続エラーの場合
- CORSの設定を確認（FastAPIの`add_middleware`）
- ポート番号の確認（8000と3000）
- 環境変数の読み込み確認

---

## 重要な設計思想

1. **会話を止めない**: 訂正は会話後のみ
2. **Notionに蓄積**: すべてのデータはNotionに保存
3. **シンプルなUI**: 学習感を出さない
4. **非同期処理**: 解析は裏で実行

---

## 次のステップ

1. ✅ スクレイピング機能の修正（403エラー対応）
2. ✅ レッスン生成APIの実装
3. ✅ フロントエンドUIの実装
4. ✅ エンドツーエンドテスト
5. ⬜ エラーハンドリングの強化
6. ⬜ ローディング状態の改善

---

## 参考ドキュメント

- [要件定義書](./要件定義書) - 詳細な技術要件
- [README.md](./README.md) - プロジェクト概要
- [Notion設定手順](./notion_db_setup_instructions.md)

---

## Cursor AIへの指示

このファイルを読んだ上で、以下の作業を進めてください:

1. **最優先**: Daily News Englishレッスン生成機能の実装
   - `backend/scraper.py` の修正（403エラー対応）
   - `backend/main.py` にレッスン生成エンドポイント追加
   - `frontend/app/lesson/page.tsx` の作成

2. **実装時の注意点**:
   - 既存のコードスタイルに合わせる
   - エラーハンドリングを必ず実装
   - ログ出力を適切に追加
   - TypeScriptの型定義を厳密に

3. **テスト**:
   - 各機能を実装後、必ず動作確認
   - エラーケースも確認

4. **質問があれば**:
   - 不明点は実装前に確認
   - 設計判断が必要な場合は提案

---

**このファイルをCursor AIのコンテキストに含めて、実装を開始してください。**
