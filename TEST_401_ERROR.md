# 401エラー時のlocalStorageクリア機能のテスト方法

## テスト手順

### 方法1: ブラウザの開発者ツールを使用

1. **アプリを起動してログイン**
   ```
   - ブラウザでアプリを開く
   - ログインする
   ```

2. **開発者ツールを開く（F12）**
   - Consoleタブを開く
   - Applicationタブ → Local Storageを開く

3. **localStorageの状態を確認**
   ```javascript
   // Consoleで実行
   console.log('Before:', {
       user_email: localStorage.getItem('user_email'),
       auth_token: localStorage.getItem('auth_token')?.substring(0, 20) + '...'
   });
   ```

4. **無効なトークンを設定**
   ```javascript
   // Consoleで実行
   localStorage.setItem('auth_token', 'invalid_token_for_testing');
   localStorage.setItem('user_email', 'test@example.com');
   ```

5. **ダッシュボードページにアクセス**
   - ブラウザで `/dashboard` に移動
   - または、ページをリロード

6. **確認すべきこと**
   - Consoleに以下のログが表示される:
     ```
     [API] 401エラー検出: 認証情報をクリアします
     [Auth] 認証情報がクリアされました（401エラー）
     [AuthGuard] Not authenticated, redirecting to /login
     ```
   - ApplicationタブのLocal Storageで `user_email` と `auth_token` が削除されている
   - 自動的に `/login` ページにリダイレクトされる

### 方法2: Networkタブで確認

1. **開発者ツールのNetworkタブを開く**
2. **ダッシュボードページにアクセス**
3. **`/api/dashboard/stats` のリクエストを確認**
   - Status: 401 になっているはず
   - Response Headersを確認

### 方法3: コンソールで直接APIを呼び出す

```javascript
// Consoleで実行
const API_URL = 'YOUR_API_URL'; // 実際のAPI URLに置き換え

// 無効なトークンを設定
localStorage.setItem('auth_token', 'invalid_token');
localStorage.setItem('user_email', 'test@example.com');

// APIを呼び出す
fetch(`${API_URL}/api/dashboard/stats`, {
    headers: {
        'Authorization': 'Bearer invalid_token',
        'Content-Type': 'application/json'
    },
    credentials: 'include'
})
.then(res => {
    console.log('Status:', res.status);
    return res.json();
})
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));

// localStorageがクリアされているか確認
setTimeout(() => {
    console.log('After:', {
        user_email: localStorage.getItem('user_email'),
        auth_token: localStorage.getItem('auth_token')
    });
}, 1000);
```

## 期待される動作

1. ✅ 401エラーが発生したとき、自動的にlocalStorageがクリアされる
2. ✅ `auth:cleared` イベントが発火する
3. ✅ AuthContextの `user` が `null` になる
4. ✅ `useRequireAuth` が自動的に `/login` にリダイレクトする
5. ✅ 認証ループが発生しない

## トラブルシューティング

### localStorageがクリアされない場合
- Consoleにエラーが出ていないか確認
- `clearAuthOn401` 関数が呼ばれているか確認
- ブラウザのキャッシュをクリアして再試行

### リダイレクトが発生しない場合
- `useRequireAuth` フックが正しく動作しているか確認
- `auth:cleared` イベントが発火しているか確認
- AuthContextのイベントリスナーが正しく設定されているか確認
