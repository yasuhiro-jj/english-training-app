# 📚 NotionデータベースIDの取得方法

## 🎯 目的

記事レッスンを保存するためのNotionデータベースを作成し、そのデータベースIDを取得します。

---

## 📋 ステップ1: Notionデータベースの作成

### 1. Notionで新しいデータベースを作成

1. Notionを開く
2. 新しいページを作成（または既存のページ内で）
3. `/` を入力してコマンドメニューを開く
4. 「**Table - Inline**」または「**Table - Full page**」を選択
5. データベースが作成されます

### 2. 必要なプロパティ（カラム）を追加

以下のプロパティを作成してください：

| プロパティ名 | タイプ | 説明 |
|------------|--------|------|
| `Title` | **Title** | 記事タイトル（自動的に作成されます） |
| `Date` | **Date** | 作成日 |
| `UserEmail` | **Rich Text** | ユーザーのメールアドレス |
| `Content` | **Rich Text** | 記事内容（プレビュー用） |
| `Category` | **Select** | カテゴリ（例: News, Technology, Business） |
| `Level` | **Select** | レベル（例: B1, B2） |
| `JapaneseTitle` | **Rich Text** | 元記事の日本語タイトル（オプション） |

**プロパティの追加方法：**
- データベースの右上の「**+**」ボタンをクリック
- または、列ヘッダーを右クリック → 「**Insert column**」

---

## 🔑 ステップ2: データベースIDの取得

### 方法1: URLから取得（推奨）

1. Notionでデータベースを開く
2. ブラウザのアドレスバーを確認
3. URLは以下のような形式です：

```
https://www.notion.so/workspace/abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

**データベースIDの部分：**
- URLの最後の部分（`/`の後）がデータベースIDです
- 例: `abc123def456ghi789jkl012mno345pqr678stu901vwx234yz`

**注意：**
- URLに`?v=`や`&p=`などのクエリパラメータが含まれている場合、それより前の部分がデータベースIDです
- 例: `https://www.notion.so/workspace/abc123def456?v=...` → データベースIDは `abc123def456`

### 方法2: Notion APIで確認

データベースを開いた状態で、ブラウザの開発者ツール（F12）のコンソールで以下を実行：

```javascript
// NotionのページIDを取得
const pageId = window.location.pathname.split('/').pop().split('?')[0];
console.log('Database ID:', pageId);
```

### 方法3: データベースの設定から確認

1. データベースを開く
2. 右上の「**...**」メニューをクリック
3. 「**Copy link**」を選択
4. コピーされたURLからデータベースIDを抽出

---

## 📝 ステップ3: 環境変数に設定

### ローカル開発環境（`.env`ファイル）

`backend/.env`ファイルに追加：

```env
NOTION_LESSONS_DB_ID=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

### Railway（本番環境）

1. Railwayダッシュボードにログイン
2. プロジェクトを選択
3. 「**Variables**」タブを開く
4. 「**+ New Variable**」をクリック
5. 以下を入力：
   - **Key**: `NOTION_LESSONS_DB_ID`
   - **Value**: 取得したデータベースID（例: `abc123def456...`）
6. 「**Add**」をクリック

---

## ✅ 確認方法

### バックエンドのヘルスチェックで確認

```bash
curl http://localhost:8000/health
```

レスポンスに以下が含まれていればOK：

```json
{
  "status": "healthy",
  "notion_db_lessons_id": true  // ← これがtrueなら設定成功
}
```

---

## 🔍 データベースIDの形式

NotionのデータベースIDは通常：
- **32文字**の英数字（a-z, 0-9）
- ハイフンなし
- 例: `abc123def456ghi789jkl012mno345pq`

---

## ⚠️ よくある間違い

### ❌ 間違い1: ページIDとデータベースIDを混同
- **ページID**: データベース内の個別の記事（ページ）のID
- **データベースID**: データベース全体のID（これが必要）

### ❌ 間違い2: URL全体を設定
```
❌ NOTION_LESSONS_DB_ID=https://www.notion.so/workspace/abc123...
✅ NOTION_LESSONS_DB_ID=abc123def456ghi789...
```

### ❌ 間違い3: クエリパラメータを含める
```
❌ NOTION_LESSONS_DB_ID=abc123def456?v=...
✅ NOTION_LESSONS_DB_ID=abc123def456
```

---

## 🎯 まとめ

1. **Notionでデータベースを作成**
2. **必要なプロパティを追加**
3. **URLからデータベースIDを取得**（最後の部分）
4. **環境変数に設定**（ローカルとRailwayの両方）

これで、記事が自動的にNotionに保存されるようになります！
