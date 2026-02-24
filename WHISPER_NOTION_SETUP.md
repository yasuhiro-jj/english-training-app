# 🎤 Whisper使用量管理のためのNotionデータベース設定

## 📋 概要

Whisper APIの使用量を追跡するために、Notion Usersデータベースに以下のプロパティ（カラム）を追加する必要があります。

---

## 🔧 ステップ1: Notion Usersデータベースを開く

1. NotionでUsersデータベースを開く
2. データベースの右上の「**+**」ボタンまたは列ヘッダーを右クリック → 「**Insert column**」を選択

---

## 📝 ステップ2: 必要なプロパティを追加

以下の3つのプロパティを追加してください：

### 1. Whisper Usage Minutes (This Month)
- **プロパティ名**: `Whisper Usage Minutes (This Month)`
- **タイプ**: **Number**（数値）
- **説明**: 今月のWhisper使用分数（無料体験の20分制限チェック用）

### 2. Whisper Usage Minutes (Total)
- **プロパティ名**: `Whisper Usage Minutes (Total)`
- **タイプ**: **Number**（数値）
- **説明**: 累計Whisper使用分数（統計用）

### 3. Last Whisper Usage Date
- **プロパティ名**: `Last Whisper Usage Date`
- **タイプ**: **Date**（日付）
- **説明**: 最後にWhisperを使った日（使用履歴の追跡用）

---

## 📋 プロパティ追加手順（詳細）

### 方法1: 列ヘッダーから追加

1. Usersデータベースを開く
2. 一番右の列の右側にある「**+**」アイコンをクリック
3. プロパティ名を入力（例: `Whisper Usage Minutes (This Month)`）
4. タイプを選択（**Number** または **Date**）
5. 「**Done**」をクリック

### 方法2: プロパティメニューから追加

1. Usersデータベースを開く
2. 右上の「**...**」メニューをクリック
3. 「**Properties**」を選択
4. 「**+ Add a property**」をクリック
5. プロパティ名とタイプを設定

---

## ✅ 確認方法

### 1. プロパティが正しく追加されているか確認

Usersデータベースに以下のプロパティが表示されていることを確認：

- ✅ `Whisper Usage Minutes (This Month)` (Number)
- ✅ `Whisper Usage Minutes (Total)` (Number)
- ✅ `Last Whisper Usage Date` (Date)

### 2. Integrationが共有されているか確認

1. Usersデータベースを開く
2. 右上の「**...**」メニューをクリック
3. 「**Connections**」を選択
4. 使用しているNotion Integrationが表示されていることを確認
5. 表示されていない場合は「**+ Add connections**」から追加

---

## 🧪 動作確認スクリプト

以下のPythonスクリプトを実行して、プロパティが正しく設定されているか確認できます：

```bash
cd backend
python check_whisper_properties.py
```

このスクリプトは：
- Usersデータベースに接続
- 必要なプロパティが存在するか確認
- プロパティのタイプが正しいか確認
- 結果を表示

---

## 📊 既存のサブスクリプション関連プロパティ

Whisper機能を正しく動作させるため、以下のプロパティも必要です（既に存在する場合もあります）：

| プロパティ名 | タイプ | 説明 |
|------------|--------|------|
| `Subscription Plan` | **Select** | Free, Basic, Premium |
| `Subscription Status` | **Select** | Trial, Active, Expired |
| `Trial Ends At` | **Date** | 無料体験終了日 |

これらのプロパティがない場合、Whisper機能はデフォルトで無料体験として動作します。

---

## ⚠️ 注意事項

1. **プロパティ名の大文字小文字**: プロパティ名は正確に一致させる必要があります
   - ✅ `Whisper Usage Minutes (This Month)`
   - ❌ `whisper usage minutes (this month)`

2. **プロパティタイプ**: Numberプロパティは小数点も扱えます（例: 15.5分）

3. **デフォルト値**: 新規ユーザーの場合、これらのプロパティは空（0またはnull）になります

---

## 🔄 プロパティのリセット（必要に応じて）

月次リセットが必要な場合：

1. NotionでUsersデータベースを開く
2. 「**Filter**」をクリック
3. 条件を設定（例: `Whisper Usage Minutes (This Month)` > 0）
4. 該当するユーザーを選択
5. 一括編集で `Whisper Usage Minutes (This Month)` を0に設定

または、バックエンドで自動的に月次リセットを実装することも可能です。

---

## 📝 まとめ

1. ✅ Usersデータベースに3つのプロパティを追加
2. ✅ Integrationが共有されていることを確認
3. ✅ 動作確認スクリプトを実行
4. ✅ サブスクリプション関連プロパティも確認

これで、Whisper使用量の追跡が正しく動作します！
