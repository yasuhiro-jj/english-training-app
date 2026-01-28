# 🚧 Daily News English - 開発で苦労したこと・つまずいたこと

> **プロジェクト**: Daily News English Training App  
> **作成日**: 2026年1月25日  
> **技術スタック**: Next.js 16, React 19, Three.js, FastAPI, Python, Notion API

---

## 📋 目次

1. [音声認識の重大なバグ](#1-音声認識の重大なバグ)
2. [3Dランディングページの実装](#2-3dランディングページの実装)
3. [認証システムの実装](#3-認証システムの実装)
4. [スクレイピング時の403エラー](#4-スクレイピング時の403エラー)
5. [環境変数と設定管理](#5-環境変数と設定管理)
6. [ポート競合とプロセス管理](#6-ポート競合とプロセス管理)
7. [学んだこと・今後の改善点](#学んだこと今後の改善点)

---

## 1. 音声認識の重大なバグ

### 🐛 問題の詳細

**症状**: 音声認識が1秒ごとにリセットされ、入力されたテキストが消えてしまう

**発生時期**: 開発初期段階

**影響範囲**: アプリのコア機能である音声入力が全く使えない状態

### 🔍 原因分析

```typescript
// ❌ 問題のあったコード
const [recordingTime, setRecordingTime] = useState(0);

useEffect(() => {
  const interval = setInterval(() => {
    setRecordingTime(prev => prev + 1); // 1秒ごとに更新
  }, 1000);
  
  // この更新が親コンポーネントの再レンダリングを引き起こす
  // → 音声認識エンジンが再初期化される
  // → 入力内容がリセットされる
}, []);
```

**根本原因**:
- 録音時間の更新（`setRecordingTime`）が親コンポーネント全体の再レンダリングを引き起こしていた
- Reactの再レンダリングのたびに、Web Speech APIの`SpeechRecognition`インスタンスが再作成されていた
- その結果、認識中のセッションが中断され、入力内容が失われていた

### ✅ 解決方法

```typescript
// ✅ 修正後のコード
const recordingTimeRef = useRef(0);
const [displayTime, setDisplayTime] = useState(0);

useEffect(() => {
  const interval = setInterval(() => {
    recordingTimeRef.current += 1;
    // 表示用の更新は最小限に（例: 5秒ごと）
    if (recordingTimeRef.current % 5 === 0) {
      setDisplayTime(recordingTimeRef.current);
    }
  }, 1000);
  
  // SpeechRecognitionはuseRefで管理し、再レンダリングの影響を受けない
  const recognition = useRef(new webkitSpeechRecognition());
  recognition.current.continuous = true;
  recognition.current.interimResults = true;
  
  return () => clearInterval(interval);
}, []);
```

**解決のポイント**:
- `useRef`を使用して、再レンダリングの影響を受けない参照を保持
- 状態更新を最小限に抑え、表示用の更新は間引き
- 音声認識エンジンのライフサイクルをレンダリングから完全に分離

### 💡 学んだこと

- **Reactの再レンダリングの影響範囲を理解する重要性**
- **`useRef`は、再レンダリングを避けたい値やインスタンスを保持するのに最適**
- **パフォーマンス最適化のため、状態更新の頻度を適切に制御する**

---

## 2. 3Dランディングページの実装

### 🎨 目標

「英語学習へのモチベーションを最大化する、圧倒的にかっこいい3Dランディングページ」の実装

### 🚧 つまずいたポイント

#### 2.1 Three.jsとReactの統合

**問題**: Three.jsは直接DOMを操作するライブラリのため、Reactの宣言的な書き方と相性が悪い

**解決策**: `@react-three/fiber`を使用
- Three.jsをReactコンポーネントとして宣言的に記述可能に
- JSXで3Dシーンを構築できる

```typescript
// ✅ React Three Fiberの使用例
import { Canvas } from '@react-three/fiber';

<Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
  <ambientLight intensity={0.5} />
  <NeuralCore />
  <FloatingWords />
</Canvas>
```

#### 2.2 パフォーマンス最適化

**問題**: 
- 3Dモデルが重く、モバイルで60fpsを維持できない
- パーティクル数が多すぎてGPU負荷が高い

**解決策**:
- インスタンス化されたメッシュを使用
- パーティクル数をデバイス性能に応じて調整
- `useMemo`で計算結果をキャッシュ

```typescript
// パーティクル数の最適化
const particleCount = useMemo(() => {
  if (typeof window !== 'undefined') {
    const isMobile = window.innerWidth < 768;
    return isMobile ? 2000 : 5000; // モバイルでは減らす
  }
  return 5000;
}, []);
```

#### 2.3 フォントの読み込み

**問題**: Three.jsの`Text`コンポーネントで日本語フォントが正しく表示されない

**解決策**: 
- Google Fontsからフォントを直接読み込む
- フォントファイルを事前にロードする

```typescript
<Text
  font="https://fonts.gstatic.com/s/inter/v12/..."
  fontSize={0.4}
  color="#a5b4fc"
>
  {word}
</Text>
```

### 💡 学んだこと

- **`@react-three/fiber`は、Three.jsをReactで扱う際の標準的な解決策**
- **3Dコンテンツは常にパフォーマンスを意識する必要がある**
- **モバイル対応は最初から考慮すべき**

---

## 3. 認証システムの実装

### 🔐 課題

Notion APIをデータベースとして使用しているため、従来のRDBMSベースの認証システムとは異なるアプローチが必要

### 🚧 つまずいたポイント

#### 3.1 JWTトークンの管理

**問題**: 
- フロントエンドとバックエンドでトークンの受け渡し方法が統一されていない
- CookieとAuthorizationヘッダーの両方に対応する必要があった

**解決策**: 
```python
# バックエンド: 両方の方法に対応
async def get_current_user(request: Request):
    token = None
    
    # Authorizationヘッダーを確認
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    
    # フォールバック: Cookieを確認
    if not token:
        token = request.cookies.get("access_token")
    
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
```

#### 3.2 セッション管理

**問題**: Notion APIにはセッション管理の機能がない

**解決策**: 
- JWTトークンでセッション情報をエンコード
- トークンの有効期限を設定（7日間）
- フロントエンドの`localStorage`でトークンを保持

### 💡 学んだこと

- **Notion APIは柔軟だが、従来のRDBMSとは異なる設計思想が必要**
- **認証システムは、フロントエンドとバックエンドの両方の要件を考慮する必要がある**

---

## 4. スクレイピング時の403エラー

### 🚫 問題

毎日新聞サイトのスクレイピング時に403 Forbiddenエラーが発生

### 🔍 原因

- ユーザーエージェントが設定されていない
- リクエストヘッダーが不十分
- サイト側のボット対策（Cloudflare等）

### ✅ 解決方法

```python
import requests
from bs4 import BeautifulSoup

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
}

response = requests.get(url, headers=headers, timeout=10)
```

### 💡 学んだこと

- **スクレイピングは、サイトの利用規約を確認してから行う**
- **適切なヘッダー設定が重要**
- **将来的には、公式APIの利用を検討すべき**

---

## 5. 環境変数と設定管理

### ⚙️ 問題

- フロントエンドとバックエンドで環境変数の管理方法が異なる
- `.env`ファイルの場所が分かりにくい
- 本番環境と開発環境の設定が混在

### 🚧 つまずいたポイント

#### 5.1 Next.jsの環境変数

**問題**: `NEXT_PUBLIC_`プレフィックスが必要なことを知らなかった

**解決策**:
```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
# NEXT_PUBLIC_プレフィックスがないと、クライアント側でアクセスできない
```

#### 5.2 バックエンドの環境変数

**問題**: `.env`ファイルの読み込みが正しく動作しない

**解決策**:
```python
# python-dotenvを使用
from dotenv import load_dotenv
import os

load_dotenv()  # .envファイルを読み込む

api_key = os.getenv("OPENAI_API_KEY")
```

### 💡 学んだこと

- **フロントエンドとバックエンドで環境変数の扱いが異なることを理解する**
- **`.env.example`ファイルを作成して、必要な環境変数を明示する**
- **環境変数の命名規則を統一する**

---

## 6. ポート競合とプロセス管理

### 🔌 問題

開発サーバーを起動しようとすると「Port 3000 is already in use」エラーが発生

### 🚧 つまずいたポイント

**問題**: 
- 以前のプロセスが残っている
- ロックファイルが残っている

**解決策**:
```powershell
# プロセスを強制終了
taskkill /F /PID <プロセスID>

# または、ロックファイルを削除
Remove-Item .next/dev/lock
```

### 💡 学んだこと

- **開発サーバーを終了する際は、`Ctrl+C`で正しく終了する**
- **ポート競合が発生したら、プロセスを確認してから対処する**

---

## 学んだこと・今後の改善点

### 📚 技術的な学び

1. **React Hooksの適切な使用**
   - `useRef`と`useState`の使い分け
   - 再レンダリングの影響範囲を理解する重要性

2. **3Dライブラリの統合**
   - `@react-three/fiber`の活用
   - パフォーマンス最適化の重要性

3. **認証システムの設計**
   - JWTトークンの適切な管理
   - セキュリティを考慮した実装

### 🎯 今後の改善点

1. **エラーハンドリングの強化**
   - ユーザーフレンドリーなエラーメッセージ
   - エラーログの適切な管理

2. **テストの追加**
   - ユニットテスト
   - 統合テスト
   - E2Eテスト

3. **パフォーマンス最適化**
   - コード分割
   - 画像の最適化
   - APIレスポンスのキャッシュ

4. **ドキュメントの充実**
   - API仕様書
   - コンポーネントのドキュメント
   - デプロイ手順の明確化

---

## 📝 まとめ

このプロジェクトを通じて、以下の重要な経験を積むことができました：

- ✅ **複雑なバグのデバッグ**: 音声認識のバグ解決により、Reactの深い理解が得られた
- ✅ **新しい技術の習得**: Three.jsとReactの統合により、3D Webアプリの実装スキルが向上
- ✅ **システム設計**: Notion APIを活用した認証システムの設計経験
- ✅ **問題解決能力**: 様々な技術的な課題を解決する経験

これらの経験は、今後のプロジェクト開発において非常に価値のある資産となります。

---

**最終更新**: 2026年1月25日
