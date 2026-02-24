# 💳 Stripe決済実装ガイド（既存アカウント用）

## 📋 既存Stripeアカウントでの実装手順

### ステップ1: Stripeダッシュボードで必要な情報を取得

#### 1. APIキーの取得
1. [Stripeダッシュボード](https://dashboard.stripe.com/)にログイン
2. **Developers** → **API keys** に移動
3. 以下のキーをコピー：
   - **Secret key** (`sk_live_...` または `sk_test_...`)
   - **Publishable key** (`pk_live_...` または `pk_test_...`)

   ⚠️ **注意**: 本番環境では `sk_live_` / `pk_live_` を使用

#### 2. 価格（Price）の作成
Stripeダッシュボードで以下の価格を作成：

1. **Products** → **Add product** をクリック
2. 各プランを作成：

**Basicプラン - 月額**
- Product name: `Basic Plan - Monthly`
- Price: `¥2,980`
- Billing period: `Monthly`
- Price IDをコピー（例: `price_1ABC123...`）

**Basicプラン - 年額**
- Product name: `Basic Plan - Yearly`
- Price: `¥29,800`
- Billing period: `Yearly`
- Price IDをコピー

**Premiumプラン - 月額**
- Product name: `Premium Plan - Monthly`
- Price: `¥4,980`
- Billing period: `Monthly`
- Price IDをコピー

**Premiumプラン - 年額**
- Product name: `Premium Plan - Yearly`
- Price: `¥49,800`
- Billing period: `Yearly`
- Price IDをコピー

#### 3. Webhookエンドポイントの設定
1. **Developers** → **Webhooks** に移動
2. **Add endpoint** をクリック
3. エンドポイントURLを入力：
   - 本番環境: `https://your-railway-domain.railway.app/api/webhooks/stripe`
   - テスト環境: `https://your-railway-domain.railway.app/api/webhooks/stripe`（同じURLでOK）
4. イベントを選択：
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. **Add endpoint** をクリック
6. **Signing secret** をコピー（`whsec_...`）

---

## 🔧 環境変数の設定

### バックエンド（Railway）

Railwayダッシュボードで以下の環境変数を追加：

```env
# Stripe設定
STRIPE_SECRET_KEY=sk_live_...  # または sk_test_...（テスト環境）
STRIPE_PUBLISHABLE_KEY=pk_live_...  # または pk_test_...（テスト環境）
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhook署名シークレット

# Stripe Price IDs（作成したPrice IDを設定）
STRIPE_PRICE_BASIC_MONTHLY=price_...
STRIPE_PRICE_BASIC_YEARLY=price_...
STRIPE_PRICE_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_PREMIUM_YEARLY=price_...

# フロントエンドURL
FRONTEND_URL=https://english-training-app.vercel.app
```

### フロントエンド（Vercel）

Vercelダッシュボードで以下の環境変数を追加：

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  # または pk_test_...
```

---

## 📝 実装チェックリスト

### バックエンド実装
- [ ] `stripe` パッケージを `requirements.txt` に追加
- [ ] `backend/app/services/stripe_service.py` を作成
- [ ] `backend/app/services/subscription_service.py` を作成
- [ ] `backend/app/routes/subscription.py` を作成
- [ ] `backend/main.py` にルートを追加
- [ ] 環境変数を設定

### フロントエンド実装
- [ ] `frontend/app/pricing/page.tsx` を作成
- [ ] `frontend/lib/api.ts` に決済API関数を追加
- [ ] ダッシュボードにサブスクリプション管理を追加

### Notionデータベース設定
- [ ] Users DBにサブスクリプション関連プロパティを追加
  - `Subscription Plan` (Select)
  - `Subscription Status` (Select)
  - `Trial Ends At` (Date)
  - `Current Period End` (Date)
  - `Stripe Customer ID` (Text)
  - `Stripe Subscription ID` (Text)

---

## 🚀 実装開始

既存アカウントの情報を取得したら、実装を開始できます。

**次のステップ**: バックエンド実装から始めますか？それとも、まずStripeダッシュボードで必要な情報を取得しますか？
