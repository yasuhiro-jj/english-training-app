# 🚀 バックエンド・フロントエンド起動ガイド

## 📋 起動手順

### 方法1: 別々のターミナルで起動（推奨）

#### ターミナル1: バックエンド
```powershell
cd "c:\Users\PC user\OneDrive\Desktop\udemy-langchain\english-training-app-clean\backend"
python main.py
```

#### ターミナル2: フロントエンド
```powershell
cd "c:\Users\PC user\OneDrive\Desktop\udemy-langchain\english-training-app-clean\frontend"
npm run dev
```

---

### 方法2: PowerShellでバックグラウンド起動

```powershell
# バックエンドをバックグラウンドで起動
cd "c:\Users\PC user\OneDrive\Desktop\udemy-langchain\english-training-app-clean\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python main.py"

# フロントエンドをバックグラウンドで起動
cd "c:\Users\PC user\OneDrive\Desktop\udemy-langchain\english-training-app-clean\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
```

---

## 🔍 確認方法

### バックエンド
- URL: `http://localhost:8000`
- ヘルスチェック: `http://localhost:8000/health`
- API Docs: `http://localhost:8000/docs`

### フロントエンド
- URL: `http://localhost:3000`
- デバッグモード: `http://localhost:3000/session?debug=1`

---

## ⚠️ 注意事項

1. **環境変数**: `.env` ファイルが正しく設定されているか確認
2. **ポート競合**: 8000番と3000番が使用中でないか確認
3. **依存関係**: `npm install` と `pip install -r requirements.txt` が完了しているか確認

---

## 🛑 停止方法

各ターミナルで `Ctrl + C` を押す
