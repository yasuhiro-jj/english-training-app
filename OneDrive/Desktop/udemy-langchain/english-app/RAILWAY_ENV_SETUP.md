# Railway環境変数設定ガイド

## 必須環境変数

以下の環境変数をRailwayのダッシュボードで設定してください：

### 1. Cookie設定（重要）
```
COOKIE_SECURE=true
```

または

```
ENVIRONMENT=production
```

**理由**: クロスオリジン（Vercel ↔ Railway）でCookieを設定するには、`SameSite=None` と `Secure=True` の両方が必要です。`Secure=True` はHTTPS接続でのみ有効です。

### 2. CORS設定
```
ALLOWED_ORIGINS=https://english-training-app.vercel.app,http://localhost:3000
```

**理由**: フロントエンドのオリジンを許可する必要があります。

### 3. Notion設定（重要）
```
NOTION_TOKEN=your_notion_integration_token
NOTION_CONVERSATION_DB_ID=your_conversation_db_id
NOTION_FEEDBACK_DB_ID=your_feedback_db_id
NOTION_LESSONS_DB_ID=your_lessons_db_id
```

**理由**: レッスン生成機能を使用する場合、`NOTION_LESSONS_DB_ID`が必須です。設定されていない場合、レッスンは生成されますがNotionに保存されません。

## 確認方法

1. Railwayのダッシュボードで「Variables」タブを開く
2. 上記の環境変数が設定されているか確認
3. 設定後、サービスを再デプロイ

## トラブルシューティング

### Cookieが設定されない場合

1. **ブラウザのコンソールで確認**
   - `[Login] Response headers:` に `set-cookie` が含まれているか
   - `[Login] access_token cookie:` が `SET` になっているか

2. **ネットワークタブで確認**
   - `/api/auth/login` のレスポンスヘッダーに `Set-Cookie: access_token=...` があるか
   - `/api/dashboard/stats` のリクエストヘッダーに `Cookie: access_token=...` があるか

3. **Railwayのログで確認**
   - `[Auth] Cookie settings - Secure: True, SameSite: none` が表示されているか
   - `[Auth] Set-Cookie header:` にCookieが含まれているか

### 401エラーが発生する場合

1. **バックエンドのログで確認**
   - `[Auth] All cookies received: []` が表示されている場合、Cookieが送信されていません
   - `[Auth] No access_token cookie found` が表示されている場合、Cookieが読み取れていません

2. **Cookieの設定を確認**
   - `SameSite=None` の場合、必ず `Secure=True` が必要
   - クロスオリジンの場合、`domain` パラメータは設定しない
