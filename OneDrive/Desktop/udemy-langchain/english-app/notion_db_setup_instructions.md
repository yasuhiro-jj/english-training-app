# Notion AI へのデータベース作成指示書

以下の指示をNotion AIにコピー&ペーストして、データベースを作成してください。

---

## 指示内容（Notion AIに貼り付け）

以下の2つのデータベースを作成してください：

### 1. データベース名: 「Conversation Logs」

以下のプロパティを持つデータベースを作成：

- **Topic** (タイトル型)
- **Date** (日付型)
- **ArticleURL** (URL型)
- **FullTranscript** (テキスト型)
- **DurationSeconds** (数値型)

---

### 2. データベース名: 「Feedback Logs」

以下のプロパティを持つデータベースを作成：

- **OriginalSentence** (タイトル型)
- **CorrectedSentence** (テキスト型)
- **Category** (セレクト型) - 選択肢: Grammar, Vocabulary, Expression, Pronunciation
- **Reason** (テキスト型)
- **Status** (セレクト型) - 選択肢: New, Reviewed
- **SessionID** (テキスト型)

---

## 作成後の確認事項

1. ✅ 2つのデータベースが作成されている
2. ✅ 各プロパティが正しく設定されている
3. ✅ Integration（連携）が両方のデータベースに共有されている

---

## 次のステップ

データベース作成後、以下の情報を控えてください：

1. **Conversation Logs のデータベースID**
   - データベースを開いた時のURL: `https://www.notion.so/xxxxx?v=yyyyy`
   - `xxxxx` の部分がデータベースID

2. **Feedback Logs のデータベースID**
   - 同様にURLから取得

これらのIDは `.env` ファイルに設定します。
