# 🚀 Stripe決済実装クイックスタート

## 📋 既存アカウントでの実装手順

### ステップ1: Stripeダッシュボードで情報取得（5分）

#### 1. APIキーの取得
1. [Stripeダッシュボード](https://dashboard.stripe.com/)にログイン
2. **Developers** → **API keys**
3. コピーするキー：
   - **Secret key** (`sk_live_...` または `sk_test_...`)
   - **Publishable key** (`pk_live_...` または `pk_test_...`)

#### 2. 価格（Price）の作成
**Products** → **Add product** で以下を作成：

| プラン | 価格 | 期間 | Price ID（後で使う） |
|--------|------|------|---------------------|
| Basic月額 | ¥2,980 | Monthly | `price_...` |
| Basic年額 | ¥29,800 | Yearly | `price_...` |
| Premium月額 | ¥4,980 | Monthly | `price_...` |
| Premium年額 | ¥49,800 | Yearly | `price_...` |

**作成方法**:
1. **Products** → **Add product**
2. Name: `Basic Plan - Monthly`
3. Price: `¥2,980`, Billing: `Monthly`
4. **Save product**
5. 作成されたPrice IDをコピー（`price_1ABC123...`形式）

#### 3. Webhookエンドポイントの設定
1. **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://your-railway-domain.railway.app/api/webhooks/stripe`
3. イベント選択：
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
4. **Add endpoint**
5. **Signing secret** をコピー（`whsec_...`）

---

### ステップ2: 環境変数の設定

#### Railway（バックエンド）
Railwayダッシュボード → **Variables** に以下を追加：

```env
STRIPE_SECRET_KEY=sk_live_...（取得したSecret key）
STRIPE_PUBLISHABLE_KEY=pk_live_...（取得したPublishable key）
STRIPE_WEBHOOK_SECRET=whsec_...（取得したSigning secret）

STRIPE_PRICE_BASIC_MONTHLY=price_...（作成したPrice ID）
STRIPE_PRICE_BASIC_YEARLY=price_...
STRIPE_PRICE_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_PREMIUM_YEARLY=price_...

FRONTEND_URL=https://english-training-app.vercel.app
```

#### Vercel（フロントエンド）
Vercelダッシュボード → **Settings** → **Environment Variables**：

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...（取得したPublishable key）
```

---

### ステップ3: 実装開始

情報を取得したら、実装を開始します。

**実装順序**:
1. ✅ Stripeサービスの実装
2. ✅ サブスクリプションサービスの実装
3. ✅ APIルートの作成
4. ✅ フロントエンド実装

---

## 📝 次のアクション

**Stripeダッシュボードで情報を取得したら、教えてください。**  
実装を開始します！
