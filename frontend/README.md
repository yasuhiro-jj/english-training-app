# Frontend Setup Guide

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 📦 インストール手順

### 1. 依存関係のインストール

```powershell
cd frontend
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env.local` を作成し、以下の値を設定してください：

```powershell
# .env.exampleをコピー
copy .env.example .env.local
```

または、手動で `.env.local` ファイルを作成：

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**注意**: `.env.local` はGitにコミットされません。`.env.example` はテンプレートファイルとしてGitにコミットされます。

### 3. 開発サーバーの起動

**基本的な起動方法:**
```powershell
cd frontend
npm run dev
```

**起動コマンド（プロジェクトルートから）:**
```powershell
cd "c:\Users\PC user\OneDrive\Desktop\udemy-langchain\english-training-app-clean\frontend"
npm run dev
```

cd "c:\Users\PC user\OneDrive\Desktop\udemy-langchain\english-training-app-clean\backend"
python main.py



サーバーが起動すると、以下のメッセージが表示されます：
```
  ▲ Next.js 16.1.1
  - Local:        http://localhost:3000
  - Ready in XXXms
```

### 4. ブラウザでアクセス

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## 🚀 起動コマンド一覧

### 開発サーバー起動
```powershell
npm run dev
```

### プロダクションビルド
```powershell
npm run build
npm start
```

### リントチェック
```powershell
npm run lint
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
