# 🚀 Daily News English - SaaS化ロードマップ

## 📋 目次
1. [フェーズ1: 基盤構築（Week 1-2）](#フェーズ1-基盤構築week-1-2)
2. [フェーズ2: 無料体験実装（Week 3-4）](#フェーズ2-無料体験実装week-3-4)
3. [フェーズ3: 決済システム統合（Week 5-6）](#フェーズ3-決済システム統合week-5-6)
4. [フェーズ4: ローンチ準備（Week 7-8）](#フェーズ4-ローンチ準備week-7-8)
5. [フェーズ5: 成長・最適化（Week 9+）](#フェーズ5-成長最適化week-9)
6. [価格戦略](#価格戦略)
7. [マーケティング戦略](#マーケティング戦略)

---

## フェーズ1: 基盤構築（Week 1-2）

### 🎯 目標
サブスクリプション管理の基盤を構築し、ユーザー階層を明確化する

### ✅ 実装タスク

#### 1.1 データベーススキーマ拡張
```python
# backend/app/models/schemas.py に追加

class SubscriptionPlan(BaseModel):
    id: str
    name: str  # "free", "basic", "premium"
    price_monthly: float
    price_yearly: float
    features: List[str]
    limits: Dict[str, int]  # {"sessions_per_month": 10, "ai_coaching_messages": 50}

class UserSubscription(BaseModel):
    user_email: str
    plan: str
    status: str  # "active", "trial", "cancelled", "expired"
    trial_ends_at: Optional[datetime]
    current_period_end: Optional[datetime]
    stripe_subscription_id: Optional[str]
    stripe_customer_id: Optional[str]
```

#### 1.2 Notionデータベース拡張
- `Users` データベースに以下カラムを追加：
  - `Subscription Plan` (Select: Free, Basic, Premium)
  - `Subscription Status` (Select: Active, Trial, Cancelled, Expired)
  - `Trial Ends At` (Date)
  - `Current Period End` (Date)
  - `Stripe Customer ID` (Text)
  - `Stripe Subscription ID` (Text)
  - `Usage - Sessions This Month` (Number)
  - `Usage - AI Messages This Month` (Number)

#### 1.3 サブスクリプションサービス実装
```python
# backend/app/services/subscription_service.py

class SubscriptionService:
    def __init__(self):
        self.client = Client(auth=os.getenv("NOTION_TOKEN"))
        self.user_db_id = os.getenv("NOTION_USER_DATABASE_ID")
    
    async def get_user_subscription(self, email: str) -> UserSubscription:
        """ユーザーのサブスクリプション情報を取得"""
        pass
    
    async def check_usage_limit(self, email: str, feature: str) -> bool:
        """使用制限をチェック"""
        pass
    
    async def increment_usage(self, email: str, feature: str):
        """使用量をインクリメント"""
        pass
    
    async def reset_monthly_usage(self, email: str):
        """月次使用量をリセット"""
        pass
```

#### 1.4 ミドルウェア実装
```python
# backend/app/middleware/subscription_middleware.py

async def check_subscription_access(
    user_email: str,
    required_feature: str
) -> bool:
    """サブスクリプションに基づいてアクセス権限をチェック"""
    subscription = await subscription_service.get_user_subscription(user_email)
    
    # 無料プランの制限チェック
    if subscription.plan == "free":
        if not await subscription_service.check_usage_limit(user_email, required_feature):
            raise HTTPException(
                status_code=403,
                detail=f"Free plan limit reached. Upgrade to continue."
            )
    
    return True
```

#### 1.5 PWA化実装（Progressive Web App）
```typescript
// frontend/public/manifest.json
{
  "name": "Daily News English",
  "short_name": "DN English",
  "description": "AI-powered English learning platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#050505",
  "theme_color": "#4f46e5",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}

// frontend/app/layout.tsx に追加
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#4f46e5" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

// Service Worker実装（オフライン対応）
// next-pwa パッケージを使用
```

**PWA化のメリット:**
- 📱 ホーム画面に追加可能（ネイティブアプリのような体験）
- 🔔 プッシュ通知対応（学習リマインダー、新機能通知）
- 📴 オフライン対応（キャッシュされたコンテンツの閲覧）
- ⚡ 高速な読み込み（Service Workerによるキャッシュ）
- 🎯 インストールプロンプト（ユーザーエンゲージメント向上）

---

## フェーズ2: 無料体験実装（Week 3-4）

### 🎯 目標
魅力的な無料体験を提供し、有料プランへの転換率を最大化

### ✅ 実装タスク

#### 2.1 無料体験プラン設計
```
【Free Plan（無料体験）】
- 期間: 7日間のフルアクセス
- 制限:
  - レッスン: 1日1回まで
  - AIコーチング: 10メッセージ/日
  - フィードバック: 基本のみ
  - Notion保存: なし
- 機能:
  - ✅ 最新ニュース記事の閲覧
  - ✅ 音声認識による会話練習
  - ✅ 基本的な文法フィードバック
  - ❌ 詳細な発音分析
  - ❌ 学習進捗の可視化
  - ❌ Notionへの自動保存
```

#### 2.2 オンボーディングフロー
```typescript
// frontend/app/onboarding/page.tsx

// ステップ1: 目標設定
- 英語学習の目標を選択（TOEIC、ビジネス、日常会話など）
- 現在のレベルを自己評価

// ステップ2: 無料体験開始
- 7日間の無料体験を開始
- カウントダウンタイマー表示

// ステップ3: 初回レッスン
- チュートリアル付きで最初のレッスンを体験
```

#### 2.3 使用制限のUI実装
```typescript
// frontend/components/UsageLimitBanner.tsx

// 使用制限に達した際のバナー
- "今日の無料レッスンは終了しました"
- "プレミアムプランにアップグレードして、無制限で学習"
- CTA: "今すぐアップグレード"
```

#### 2.4 体験終了リマインダー
```python
# backend/app/services/notification_service.py

# 体験終了3日前、1日前、当日にメール通知
# メール内容:
- これまでの学習進捗を可視化
- プレミアム機能の紹介
- 特別オファー（初月50%オフなど）
```

---

## フェーズ3: 決済システム統合（Week 5-6）

### 🎯 目標
Stripeを統合し、シームレスな決済体験を提供

### ✅ 実装タスク

#### 3.1 Stripeアカウント設定
- Stripeアカウント作成（本番環境）
- Webhookエンドポイント設定
- APIキーの環境変数設定

#### 3.2 Stripe統合実装
```python
# backend/app/services/stripe_service.py

import stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

class StripeService:
    async def create_customer(self, email: str) -> str:
        """Stripe顧客を作成"""
        customer = stripe.Customer.create(email=email)
        return customer.id
    
    async def create_checkout_session(
        self,
        customer_id: str,
        plan: str,
        mode: str = "subscription"  # "subscription" or "setup"
    ) -> str:
        """チェックアウトセッションを作成"""
        prices = {
            "basic": {
                "monthly": os.getenv("STRIPE_PRICE_BASIC_MONTHLY"),
                "yearly": os.getenv("STRIPE_PRICE_BASIC_YEARLY"),
            },
            "premium": {
                "monthly": os.getenv("STRIPE_PRICE_PREMIUM_MONTHLY"),
                "yearly": os.getenv("STRIPE_PRICE_PREMIUM_YEARLY"),
            }
        }
        
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price": prices[plan][mode],
                "quantity": 1,
            }],
            mode="subscription",
            success_url=f"{os.getenv('FRONTEND_URL')}/dashboard?success=true",
            cancel_url=f"{os.getenv('FRONTEND_URL')}/pricing?canceled=true",
        )
        return session.url
    
    async def handle_webhook(self, event: dict):
        """Stripe Webhookを処理"""
        if event["type"] == "customer.subscription.created":
            # サブスクリプション作成時の処理
            pass
        elif event["type"] == "customer.subscription.updated":
            # サブスクリプション更新時の処理
            pass
        elif event["type"] == "customer.subscription.deleted":
            # サブスクリプションキャンセル時の処理
            pass
```

#### 3.3 価格設定ページ
```typescript
// frontend/app/pricing/page.tsx

// 3つのプランを比較表示
// 各プランの特徴を明確に
// "今すぐ始める"ボタンでStripe Checkoutへ
```

#### 3.4 ダッシュボードにサブスクリプション管理を追加
```typescript
// frontend/app/dashboard/page.tsx

// 現在のプラン表示
// 使用状況の可視化
// アップグレード/ダウングレードボタン
// 請求履歴
```

---

## フェーズ4: ローンチ準備（Week 7-8）

### 🎯 目標
ローンチに向けた最終調整とマーケティング準備

### ✅ 実装タスク

#### 4.1 アナリティクス統合
- Google Analytics 4
- Mixpanel（ユーザー行動分析）
- Hotjar（ヒートマップ・セッション記録）

#### 4.2 エラーハンドリング強化
- Sentry統合（エラー追跡）
- ユーザーフィードバック機能

#### 4.3 パフォーマンス最適化
- 3Dアセットの最適化
- 画像の遅延読み込み
- APIレスポンス時間の最適化

#### 4.4 SEO対策
- メタタグ最適化
- 構造化データ（JSON-LD）
- サイトマップ生成

#### 4.5 ローンチキャンペーン準備
- 早期アクセス特典の設計
- 紹介プログラムの実装
- ソーシャルメディア用アセット作成

---

## フェーズ5: 成長・最適化（Week 9+）

### 🎯 目標
継続的な改善と成長

### ✅ 実装タスク

#### 5.1 A/Bテスト実装
- 価格表示のテスト
- CTAボタンのテキストテスト
- オンボーディングフローの最適化

#### 5.2 リテンション機能
- 学習ストリーク（連続学習日数）
- アチーブメントシステム
- 週次/月次レポートメール

#### 5.3 紹介プログラム
```python
# 紹介コード生成・管理
# 紹介者と被紹介者の両方に特典
# 例: 紹介者→1ヶ月無料、被紹介者→初月50%オフ
```

#### 5.4 エンタープライズプラン
- 法人向けプランの設計
- 管理者ダッシュボード
- 一括請求機能

---

## 💰 価格戦略

### プラン設計

#### 🆓 Free（無料体験）
- **期間**: 7日間
- **価格**: ¥0
- **特徴**:
  - 1日1レッスン
  - 基本的なAIフィードバック
  - 学習ログ（Notion保存なし）

#### ⭐ Basic（ベーシック）
- **価格**: 
  - 月額: ¥2,980/月
  - 年額: ¥29,800/年（約17%オフ）
- **特徴**:
  - 無制限レッスン
  - AIコーチング（100メッセージ/月）
  - 詳細な文法・発音フィードバック
  - Notionへの自動保存
  - 学習進捗の可視化

#### 🚀 Premium（プレミアム）
- **価格**:
  - 月額: ¥4,980/月
  - 年額: ¥49,800/年（約17%オフ）
- **特徴**:
  - Basicの全機能
  - AIコーチング無制限
  - カスタム学習プラン
  - 優先サポート
  - 週次学習レポート
  - 発音分析（詳細版）

### 価格戦略のポイント
1. **心理的価格設定**: ¥2,980、¥4,980（¥3,000、¥5,000より安く感じる）
2. **年額割引**: 17%オフで年間契約を促進
3. **無料体験**: 7日間で価値を実感してもらう
4. **段階的アップグレード**: Free → Basic → Premium の自然な流れ

---

## 📢 マーケティング戦略

### ローンチ前（Pre-Launch）

#### 1. ランディングページ最適化
- **現在の3Dランディングページを活用**
- 社会証明の追加（利用者数、レビュー）
- FAQセクション
- デモ動画の埋め込み

#### 2. 早期アクセスリスト構築
- メール登録フォーム
- 早期アクセス特典: 初月50%オフ
- ウェイティングリストの管理

#### 3. コンテンツマーケティング
- ブログ記事: "AIで英語学習が変わる理由"
- YouTube動画: デモ・使い方解説
- SNS投稿: Twitter/X、Instagram、LinkedIn

### ローンチ時（Launch）

#### 1. ローンチキャンペーン
- **期間**: 最初の2週間
- **特典**:
  - 初月50%オフ
  - 年額プラン購入でさらに10%オフ
  - 紹介プログラム開始

#### 2. プレスリリース
- TechCrunch Japan
- 英語学習メディア
- AI関連メディア

#### 3. インフルエンサー連携
- 英語学習YouTuber
- ビジネスパーソン向けインフルエンサー

### ローンチ後（Post-Launch）

#### 1. リテンション施策
- 週次メール: 学習進捗レポート
- プッシュ通知: 学習リマインダー
- アチーブメント通知

#### 2. 紹介プログラム
- 紹介者: 1ヶ月無料
- 被紹介者: 初月50%オフ
- 紹介リンクの自動生成

#### 3. 継続的な改善
- ユーザーフィードバックの収集
- 機能追加のアナウンス
- 成功事例の共有

---

## 🎯 成功指標（KPI）

### ローンチ後3ヶ月の目標

1. **ユーザー獲得**
   - 無料体験開始: 1,000人
   - 有料転換率: 15-20%
   - 月間アクティブユーザー（MAU）: 500人

2. **収益**
   - 月間経常収益（MRR）: ¥500,000
   - 顧客獲得単価（CAC）: ¥5,000以下
   - 顧客生涯価値（LTV）: ¥50,000以上

3. **エンゲージメント**
   - 日次アクティブユーザー（DAU）/MAU比率: 30%以上
   - 平均セッション時間: 15分以上
   - 月次リテンション率: 60%以上

---

## 🛠 技術スタック

### 現在のスタック
- **Frontend**: Next.js 16, React 19, Three.js, Tailwind CSS
- **Backend**: FastAPI, Python
- **Database**: Notion API
- **Auth**: JWT

### 追加が必要なスタック
- **決済**: Stripe
- **PWA**: next-pwa (Service Worker自動生成)
- **分析**: Google Analytics 4, Mixpanel
- **エラー追跡**: Sentry
- **メール**: SendGrid / Resend
- **通知**: OneSignal / Firebase Cloud Messaging (PWAプッシュ通知)

---

## 📅 タイムライン概要

| フェーズ | 期間 | 主要成果物 |
|---------|------|-----------|
| フェーズ1 | Week 1-2 | サブスクリプション基盤、データベース拡張 |
| フェーズ2 | Week 3-4 | 無料体験実装、オンボーディング |
| フェーズ3 | Week 5-6 | Stripe統合、決済フロー |
| フェーズ4 | Week 7-8 | ローンチ準備、マーケティング |
| フェーズ5 | Week 9+ | 成長・最適化、機能拡張 |

---

## 🚨 リスクと対策

### 技術的リスク
- **Notion APIの制限**: レート制限に達する可能性
  - 対策: キャッシュ実装、バッチ処理の最適化
- **3Dパフォーマンス**: モバイルでの負荷
  - 対策: デバイス検出、軽量版の提供

### ビジネスリスク
- **転換率の低さ**: 無料体験から有料への転換が少ない
  - 対策: A/Bテスト、価格最適化、機能差別化の強化
- **競合の出現**: 類似サービスの登場
  - 対策: 独自価値の強化（3D UI、AI品質）、ブランド確立

---

## 📝 次のステップ

1. **今週中に開始**: フェーズ1の実装開始
2. **優先順位**: サブスクリプション基盤 → 無料体験 → 決済統合
3. **並行作業**: マーケティング準備は開発と並行して進める

---

**このロードマップは、実際のユーザーフィードバックとデータに基づいて継続的に更新していきます。**
