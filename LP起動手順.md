# LP確認手順

## 方法1: PowerShellで直接起動

1. PowerShellを開く
2. 以下のコマンドを実行：

```powershell
cd "c:\Users\PC user\OneDrive\Desktop\udemy-langchain\english-training-app-clean\frontend"
npm run dev
```

3. 以下のようなメッセージが表示されたら成功：
```
  ▲ Next.js 16.1.1
  - Local:        http://localhost:3000
  - Ready in XXXms
```

4. ブラウザで http://localhost:3000 にアクセス

## 方法2: VS Codeのターミナルから起動

1. VS Codeでプロジェクトを開く
2. ターミナルを開く（Ctrl + `）
3. 以下のコマンドを実行：

```powershell
cd frontend
npm run dev
```

4. ブラウザで http://localhost:3000 にアクセス

## トラブルシューティング

### エラー: "EPERM" または権限エラー
- PowerShellを管理者として実行してみてください
- または、VS Codeのターミナルから実行してください

### エラー: "port 3000 is already in use"
- 既にサーバーが起動している可能性があります
- ブラウザで http://localhost:3000 にアクセスしてみてください
- または、別のポートで起動：
  ```powershell
  npm run dev -- -p 3001
  ```

### ページが表示されない
- ブラウザのコンソール（F12）でエラーを確認してください
- サーバーが正常に起動しているか確認してください
