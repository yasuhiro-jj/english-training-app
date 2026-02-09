# 💳 Stripe決済システム実装方向性書

## 📋 実装状況の現状

### ✅ 実装済み
- **サブスクリプション状態管理**: `backend/app/services/usage_service.py`でNotionからサブスクリプション情報を取得
- **体験期間管理**: 7日間の無料体験期間の開始・終了判定ロジック
- **ダッシュボード表示**: 体験期間終了時の通知表示機能
- **ドキュメント**: Stripe統合の設計ドキュメント（`PAYMENT_IMPLEMENTATION.md`、`STRIPE_SETUP_GUIDE.md`）

### ❌ 未実装（実装が必要）
- **Stripeサービス**: `backend/app/services/stripe_service.py`（存在しない）
- **サブスクリプションサービス**: `backend/app/services/subscription_service.py`（存在しない）
- **サブスクリプションAPIルート**: `backend/app/routes/subscription.py`（存在しない）
- **Stripe Webhookエンドポイント**: `backend/app/routes/webhooks.py`（存在しない）
- **依存パッケージ**: `requirements.txt`に`stripe`パッケージが未追加
- **フロントエンド**: プラン選択・決済フローのUI実装

---

## 🎯 実装目標

### 1. 決済フローの実装
ユーザーが無料体験終了後、Basic/Premiumプランを選択して決済できるようにする。

### 2. プラン変更機能の実装
既存ユーザーがStripe Customer Portal経由でプラン変更・キャンセル・支払い方法変更を行えるようにする。

### 3. Webhookによる自動同期
Stripe側での変更（プラン変更・更新・キャンセル）をWebhookで検知し、Notionデータベースを自動更新する。

---

## 📐 実装アーキテクチャ

### バックエンド構成

```
backend/
├── app/
│   ├── services/
│   │   ├── stripe_service.py          # 新規作成: Stripe API操作
│   │   ├── subscription_service.py    # 新規作成: サブスクリプション管理
│   │   └── usage_service.py           # 既存: サブスクリプション状態取得
│   ├── routes/
│   │   ├── subscription.py            # 新規作成: 決済・プラン変更API
│   │   └── webhooks.py                # 新規作成: Stripe Webhook処理
│   └── models/
│       └── schemas.py                  # 既存: 必要に応じて拡張
└── requirements.txt                    # stripeパッケージ追加
```

### フロントエンド構成

```
frontend/
├── app/
│   ├── pricing/
│   │   └── page.tsx                    # 新規作成: プラン選択ページ
│   └── dashboard/
│       └── page.tsx                     # 既存: プラン変更ボタン追加
└── components/
    └── SubscriptionStatus.tsx          # 新規作成: サブスクリプション状態表示
```

---

## 🔧 実装詳細

### 1. Stripeサービスの実装（`backend/app/services/stripe_service.py`）

**責務**:
- Stripe顧客の作成・取得
- Checkoutセッションの作成（新規購入用）
- Customer Portalセッションの作成（プラン変更・キャンセル用）
- サブスクリプション情報の取得・更新
- Webhookイベントの検証・処理

**主要メソッド**:
```python
class StripeService:
    async def create_customer(email: str, name: Optional[str] = None) -> str
    async def create_checkout_session(customer_id: str, plan: str, billing_period: str) -> Dict
    async def create_portal_session(customer_id: str) -> str
    async def get_subscription(subscription_id: str) -> Dict
    async def update_subscription(subscription_id: str, new_price_id: str) -> Dict
    async def handle_webhook(payload: bytes, signature: str) -> Dict
```

**環境変数**:
- `STRIPE_SECRET_KEY`: Stripe Secret Key
- `STRIPE_PUBLISHABLE_KEY`: Stripe Publishable Key（フロントエンド用）
- `STRIPE_WEBHOOK_SECRET`: Webhook署名検証用
- `STRIPE_PRICE_BASIC_MONTHLY`: Basic月額のPrice ID
- `STRIPE_PRICE_BASIC_YEARLY`: Basic年額のPrice ID
- `STRIPE_PRICE_PREMIUM_MONTHLY`: Premium月額のPrice ID
- `STRIPE_PRICE_PREMIUM_YEARLY`: Premium年額のPrice ID

### 2. サブスクリプションサービスの実装（`backend/app/services/subscription_service.py`）

**責務**:
- Notionデータベースとの連携
- Stripe情報とNotion情報の同期
- サブスクリプション状態の管理

**主要メソッド**:
```python
class SubscriptionService:
    async def get_user_subscription(email: str) -> Optional[Dict]
    async def update_subscription_from_stripe(email: str, stripe_customer_id: str, stripe_subscription_id: str, plan: str, status: str) -> None
    async def cancel_subscription(email: str) -> None
```

**Notionデータベースのプロパティ**:
- `Email` (Text): ユーザーのメールアドレス
- `Subscription Plan` (Select): "Free", "Basic", "Premium"
- `Subscription Status` (Select): "Trial", "Active", "Expired", "Canceled"
- `Trial Ends At` (Date): 無料体験終了日
- `Stripe Customer ID` (Text): Stripe顧客ID
- `Stripe Subscription ID` (Text): StripeサブスクリプションID

### 3. サブスクリプションAPIルート（`backend/app/routes/subscription.py`）

**エンドポイント**:
- `POST /api/subscription/checkout`: Checkoutセッション作成（新規購入）
- `GET /api/subscription/portal`: Customer Portalセッション作成（プラン変更・キャンセル）
- `GET /api/subscription/status`: 現在のサブスクリプション状態取得

**認証**: すべてのエンドポイントで`get_current_user`を使用

### 4. Webhookエンドポイント（`backend/app/routes/webhooks.py`）

**エンドポイント**:
- `POST /api/webhooks/stripe`: Stripe Webhook受信

**処理するイベント**:
- `checkout.session.completed`: 決済完了時、Notionを更新
- `customer.subscription.created`: サブスクリプション作成時
- `customer.subscription.updated`: プラン変更・更新時、Notionを更新
- `customer.subscription.deleted`: キャンセル時、Notionを更新

**セキュリティ**: Webhook署名検証を必ず実装

### 5. フロントエンド実装

#### プラン選択ページ（`frontend/app/pricing/page.tsx`）
- Basic/Premiumプランの表示
- 月額/年額の選択
- 「今すぐ始める」ボタンでCheckoutセッション作成APIを呼び出し、Stripe Checkoutにリダイレクト

#### ダッシュボード（`frontend/app/dashboard/page.tsx`）
- 現在のプラン表示
- 「プランを変更」ボタンでCustomer Portalセッション作成APIを呼び出し、Stripe Customer Portalにリダイレクト

---

## 🔄 決済フロー

### 新規購入フロー
```
1. ユーザーがLPまたはダッシュボードから「今すぐ始める」をクリック
2. フロントエンド: POST /api/subscription/checkout を呼び出し
3. バックエンド: Stripe Checkoutセッションを作成
4. フロントエンド: Stripe Checkoutページにリダイレクト
5. ユーザーが決済情報を入力して決済完了
6. Stripe: checkout.session.completed イベントをWebhookで送信
7. バックエンド: Webhookでイベントを受信し、Notionを更新
8. ユーザー: ダッシュボードにリダイレクトされ、有料プランの機能が利用可能に
```

### プラン変更フロー
```
1. ユーザーがダッシュボードから「プランを変更」をクリック
2. フロントエンド: GET /api/subscription/portal を呼び出し
3. バックエンド: Stripe Customer Portalセッションを作成
4. フロントエンド: Stripe Customer Portalにリダイレクト
5. ユーザーがプラン変更・キャンセル・支払い方法変更を実行
6. Stripe: customer.subscription.updated または customer.subscription.deleted イベントをWebhookで送信
7. バックエンド: Webhookでイベントを受信し、Notionを更新
8. ユーザー: ダッシュボードに戻り、変更が反映される
```

---

## 📦 依存パッケージ

### バックエンド
`requirements.txt`に以下を追加:
```
stripe>=7.0.0
```

### フロントエンド
Stripe.jsはCDN経由で読み込むか、`@stripe/stripe-js`パッケージを使用（必要に応じて）

---

## 🔐 セキュリティ要件

1. **Webhook署名検証**: すべてのWebhookリクエストで署名を検証
2. **認証**: すべてのAPIエンドポイントでJWT認証を実装
3. **環境変数**: Stripe Secret Keyは環境変数で管理し、Gitにコミットしない
4. **HTTPS**: WebhookエンドポイントはHTTPS必須

---

## 🧪 テスト方法

### ローカル開発環境
1. Stripe CLIを使用してWebhookをローカルに転送:
   ```bash
   stripe listen --forward-to localhost:8000/api/webhooks/stripe
   ```
2. テストイベントをトリガー:
   ```bash
   stripe trigger checkout.session.completed
   ```

### テストモード
- Stripeダッシュボードでテストモードに切り替え
- テスト用のカード番号を使用（4242 4242 4242 4242など）

---

## 📝 実装チェックリスト

### バックエンド
- [ ] `stripe`パッケージを`requirements.txt`に追加
- [ ] `backend/app/services/stripe_service.py`を作成
- [ ] `backend/app/services/subscription_service.py`を作成
- [ ] `backend/app/routes/subscription.py`を作成
- [ ] `backend/app/routes/webhooks.py`を作成
- [ ] `backend/main.py`にルーターを追加
- [ ] 環境変数を設定（Railwayまたは`.env`）

### フロントエンド
- [ ] `frontend/app/pricing/page.tsx`を作成
- [ ] `frontend/components/SubscriptionStatus.tsx`を作成
- [ ] `frontend/app/dashboard/page.tsx`にプラン変更ボタンを追加
- [ ] `frontend/lib/api.ts`にサブスクリプション関連のAPI関数を追加

### Stripeダッシュボード設定
- [ ] Stripeアカウント作成（または既存アカウント使用）
- [ ] APIキー取得（Secret Key、Publishable Key）
- [ ] 価格（Price）を作成（Basic月額/年額、Premium月額/年額）
- [ ] Webhookエンドポイントを設定
- [ ] Webhook署名シークレットを取得

### テスト
- [ ] ローカル環境でStripe CLIを使用してWebhookをテスト
- [ ] テストモードで決済フローをテスト
- [ ] プラン変更フローをテスト
- [ ] Webhookイベント処理をテスト

---

## 🚀 実装優先順位

1. **Phase 1: 基盤実装**
   - Stripeサービスの実装
   - サブスクリプションサービスの実装
   - 基本的なAPIルートの実装

2. **Phase 2: Webhook実装**
   - Webhookエンドポイントの実装
   - イベント処理ロジックの実装
   - Notion同期ロジックの実装

3. **Phase 3: フロントエンド実装**
   - プラン選択ページの実装
   - ダッシュボードへの統合
   - UI/UXの調整

4. **Phase 4: テスト・デバッグ**
   - エンドツーエンドテスト
   - エラーハンドリングの改善
   - ログ・モニタリングの追加

---

## 📚 参考ドキュメント

- **既存ドキュメント**:
  - `PAYMENT_IMPLEMENTATION.md`: 詳細な実装ガイド
  - `STRIPE_SETUP_GUIDE.md`: Stripeアカウント設定ガイド
  - `STRIPE_QUICK_START.md`: クイックスタートガイド

- **Stripe公式ドキュメント**:
  - [Stripe Checkout](https://stripe.com/docs/payments/checkout)
  - [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
  - [Stripe Webhooks](https://stripe.com/docs/webhooks)
  - [Stripe Python SDK](https://stripe.com/docs/api/python)

---

## ⚠️ 注意事項

1. **無料体験期間**: 現在の実装では無料体験期間はNotionで管理されています。Stripe側でも無料体験期間を設定する場合は、`create_checkout_session`の`trial_period_days`パラメータを使用してください。

2. **既存ユーザー**: 既に無料体験中のユーザーがいる場合、Stripe Customer IDが存在しない可能性があります。その場合は、初回決済時にCustomerを作成する必要があります。

3. **エラーハンドリング**: Stripe API呼び出し時のエラー（ネットワークエラー、APIエラーなど）を適切にハンドリングし、ユーザーに分かりやすいエラーメッセージを表示してください。

4. **ログ**: Stripe関連の操作（Checkout作成、Webhook受信など）は必ずログに記録し、問題発生時のデバッグに備えてください。

---

## 📞 実装時の質問・確認事項

実装中に不明点があれば、以下を確認してください：

1. **Stripeアカウント**: 既存のStripeアカウントを使用するか、新規作成するか
2. **価格設定**: 価格はStripeダッシュボードで既に作成済みか
3. **Webhook URL**: 本番環境のWebhook URLは確定しているか（Railwayのドメインなど）
4. **テスト環境**: テストモードと本番モードの切り替え方法
5. **既存ユーザー**: 既存ユーザーのStripe Customer ID移行方法

---

**最終更新日**: 2026年2月4日
**作成者**: AI Assistant
**ステータス**: 実装待ち
