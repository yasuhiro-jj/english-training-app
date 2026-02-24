# 💳 課金システム実装ガイド

## 📋 目次
1. [実装概要](#実装概要)
2. [Stripeアカウント設定](#stripeアカウント設定)
3. [バックエンド実装](#バックエンド実装)
4. [フロントエンド実装](#フロントエンド実装)
5. [Webhook実装](#webhook実装)
6. [テスト方法](#テスト方法)

---

## 🎯 実装概要

### 課金フロー
1. **無料体験開始**: ユーザーがサインアップ → 7日間の無料体験開始
2. **プラン選択**: 無料体験終了後、ユーザーがBasic/Premiumプランを選択
3. **Stripe Checkout**: Stripeの決済ページにリダイレクト
4. **決済完了**: 決済成功後、Webhookでサブスクリプション情報を更新
5. **サービス利用開始**: 有料プランの機能が利用可能に

### 価格設定
- **Basic**: ¥2,980/月、¥29,800/年（17%オフ）
- **Premium**: ¥4,980/月、¥49,800/年（17%オフ）

---

## 🔧 Stripeアカウント設定

### 1. Stripeアカウント作成
1. [Stripe](https://stripe.com/jp)にアクセス
2. アカウントを作成（本番環境用）
3. ダッシュボードでAPIキーを取得

### 2. 価格（Price）の作成
Stripeダッシュボードで以下の価格を作成：

#### Basicプラン
- **月額**: ¥2,980/月（定期課金）
  - Price ID: `price_basic_monthly`（例）
- **年額**: ¥29,800/年（定期課金）
  - Price ID: `price_basic_yearly`（例）

#### Premiumプラン
- **月額**: ¥4,980/月（定期課金）
  - Price ID: `price_premium_monthly`（例）
- **年額**: ¥49,800/年（定期課金）
  - Price ID: `price_premium_yearly`（例）

### 3. Webhookエンドポイント設定
1. Stripeダッシュボード → Developers → Webhooks
2. エンドポイント追加: `https://your-domain.com/api/webhooks/stripe`
3. イベントを選択:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.completed`
4. Webhook署名シークレットを取得（`whsec_...`）

### 4. 環境変数の設定
`.env`ファイルに以下を追加：
```env
# Stripe設定
STRIPE_SECRET_KEY=sk_live_...  # 本番環境
STRIPE_PUBLISHABLE_KEY=pk_live_...  # 本番環境
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhook署名シークレット

# Stripe Price IDs
STRIPE_PRICE_BASIC_MONTHLY=price_...
STRIPE_PRICE_BASIC_YEARLY=price_...
STRIPE_PRICE_PREMIUM_MONTHLY=price_...
STRIPE_PREMIUM_YEARLY=price_...

# フロントエンドURL
FRONTEND_URL=https://your-domain.com
```

---

## 🔨 バックエンド実装

### 1. 依存関係のインストール
```bash
pip install stripe
```

`requirements.txt`に追加：
```
stripe>=7.0.0
```

### 2. Stripeサービスの作成

`backend/app/services/stripe_service.py`を作成：

```python
import os
import stripe
from typing import Optional, Dict
from datetime import datetime

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

class StripeService:
    def __init__(self):
        self.prices = {
            "basic": {
                "monthly": os.getenv("STRIPE_PRICE_BASIC_MONTHLY"),
                "yearly": os.getenv("STRIPE_PRICE_BASIC_YEARLY"),
            },
            "premium": {
                "monthly": os.getenv("STRIPE_PRICE_PREMIUM_MONTHLY"),
                "yearly": os.getenv("STRIPE_PRICE_PREMIUM_YEARLY"),
            }
        }
    
    async def create_customer(self, email: str, name: Optional[str] = None) -> str:
        """Stripe顧客を作成"""
        customer = stripe.Customer.create(
            email=email,
            name=name,
        )
        return customer.id
    
    async def create_checkout_session(
        self,
        customer_id: str,
        plan: str,  # "basic" or "premium"
        billing_period: str = "monthly",  # "monthly" or "yearly"
        trial_days: int = 0,
    ) -> Dict:
        """チェックアウトセッションを作成"""
        price_id = self.prices[plan][billing_period]
        
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price": price_id,
                "quantity": 1,
            }],
            mode="subscription",
            subscription_data={
                "trial_period_days": trial_days,
            } if trial_days > 0 else None,
            success_url=f"{os.getenv('FRONTEND_URL')}/dashboard?success=true&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{os.getenv('FRONTEND_URL')}/pricing?canceled=true",
            metadata={
                "plan": plan,
                "billing_period": billing_period,
            }
        )
        return {
            "session_id": session.id,
            "url": session.url,
        }
    
    async def create_portal_session(self, customer_id: str) -> str:
        """顧客ポータルセッションを作成（プラン変更・キャンセル用）"""
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{os.getenv('FRONTEND_URL')}/dashboard",
        )
        return session.url
    
    async def get_subscription(self, subscription_id: str):
        """サブスクリプション情報を取得"""
        return stripe.Subscription.retrieve(subscription_id)
    
    async def cancel_subscription(self, subscription_id: str):
        """サブスクリプションをキャンセル"""
        return stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=True
        )
    
    async def handle_webhook(self, payload: bytes, signature: str):
        """Stripe Webhookを処理"""
        webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, webhook_secret
            )
        except ValueError:
            raise ValueError("Invalid payload")
        except stripe.error.SignatureVerificationError:
            raise ValueError("Invalid signature")
        
        return event
```

### 3. サブスクリプションサービスの拡張

`backend/app/services/subscription_service.py`を作成：

```python
import os
from datetime import datetime, timedelta
from typing import Optional, Dict
from notion_client import Client
from app.services.stripe_service import StripeService

class SubscriptionService:
    def __init__(self):
        self.client = Client(auth=os.getenv("NOTION_TOKEN"))
        self.user_db_id = os.getenv("NOTION_USER_DATABASE_ID")
        self.stripe_service = StripeService()
    
    async def get_user_subscription(self, email: str) -> Dict:
        """ユーザーのサブスクリプション情報を取得"""
        # Notionからユーザー情報を取得
        response = self.client.databases.query(
            database_id=self.user_db_id,
            filter={
                "property": "Email",
                "email": {
                    "equals": email
                }
            }
        )
        
        if not response["results"]:
            return None
        
        user = response["results"][0]
        props = user["properties"]
        
        return {
            "plan": props.get("Subscription Plan", {}).get("select", {}).get("name", "free"),
            "status": props.get("Subscription Status", {}).get("select", {}).get("name", "trial"),
            "trial_ends_at": props.get("Trial Ends At", {}).get("date", {}).get("start"),
            "current_period_end": props.get("Current Period End", {}).get("date", {}).get("start"),
            "stripe_customer_id": props.get("Stripe Customer ID", {}).get("rich_text", [{}])[0].get("plain_text"),
            "stripe_subscription_id": props.get("Stripe Subscription ID", {}).get("rich_text", [{}])[0].get("plain_text"),
        }
    
    async def start_trial(self, email: str) -> Dict:
        """7日間の無料体験を開始"""
        trial_ends_at = datetime.now() + timedelta(days=7)
        
        # Notionを更新
        response = self.client.databases.query(
            database_id=self.user_db_id,
            filter={
                "property": "Email",
                "email": {"equals": email}
            }
        )
        
        if response["results"]:
            user_id = response["results"][0]["id"]
            self.client.pages.update(
                page_id=user_id,
                properties={
                    "Subscription Plan": {"select": {"name": "Free"}},
                    "Subscription Status": {"select": {"name": "Trial"}},
                    "Trial Ends At": {"date": {"start": trial_ends_at.isoformat()}},
                }
            )
        
        return {
            "plan": "free",
            "status": "trial",
            "trial_ends_at": trial_ends_at.isoformat(),
        }
    
    async def update_subscription_from_stripe(
        self,
        email: str,
        stripe_customer_id: str,
        stripe_subscription_id: str,
        plan: str,
        status: str,
        current_period_end: datetime,
    ):
        """Stripeの情報からNotionを更新"""
        response = self.client.databases.query(
            database_id=self.user_db_id,
            filter={
                "property": "Email",
                "email": {"equals": email}
            }
        )
        
        if response["results"]:
            user_id = response["results"][0]["id"]
            self.client.pages.update(
                page_id=user_id,
                properties={
                    "Subscription Plan": {"select": {"name": plan.capitalize()}},
                    "Subscription Status": {"select": {"name": status.capitalize()}},
                    "Stripe Customer ID": {"rich_text": [{"text": {"content": stripe_customer_id}}]},
                    "Stripe Subscription ID": {"rich_text": [{"text": {"content": stripe_subscription_id}}]},
                    "Current Period End": {"date": {"start": current_period_end.isoformat()}},
                }
            )
    
    async def check_usage_limit(self, email: str, feature: str) -> bool:
        """使用制限をチェック"""
        subscription = await self.get_user_subscription(email)
        
        if subscription["plan"] == "free":
            # 無料プランの制限チェック
            if feature == "sessions_per_day":
                # 1日1レッスンの制限
                # 実装が必要
                return True
            elif feature == "ai_messages":
                # AIメッセージの制限
                # 実装が必要
                return True
        
        return True
    
    async def increment_usage(self, email: str, feature: str):
        """使用量をインクリメント"""
        # Notionの使用量カラムを更新
        # 実装が必要
        pass
```

### 4. APIルートの作成

`backend/app/routes/subscription.py`を作成：

```python
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from app.models.schemas import User
from app.deps import get_current_user
from app.services.stripe_service import StripeService
from app.services.subscription_service import SubscriptionService

router = APIRouter(prefix="/api/subscription", tags=["subscription"])

stripe_service = StripeService()
subscription_service = SubscriptionService()

@router.post("/checkout")
async def create_checkout_session(
    plan: str,  # "basic" or "premium"
    billing_period: str = "monthly",  # "monthly" or "yearly"
    current_user: User = Depends(get_current_user),
):
    """チェックアウトセッションを作成"""
    if plan not in ["basic", "premium"]:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    if billing_period not in ["monthly", "yearly"]:
        raise HTTPException(status_code=400, detail="Invalid billing period")
    
    # Stripe顧客を作成または取得
    subscription = await subscription_service.get_user_subscription(current_user.email)
    
    if subscription and subscription.get("stripe_customer_id"):
        customer_id = subscription["stripe_customer_id"]
    else:
        customer_id = await stripe_service.create_customer(
            email=current_user.email,
            name=current_user.name,
        )
    
    # チェックアウトセッションを作成
    session = await stripe_service.create_checkout_session(
        customer_id=customer_id,
        plan=plan,
        billing_period=billing_period,
        trial_days=0,  # 無料体験は既に終了している想定
    )
    
    return {"checkout_url": session["url"]}

@router.get("/portal")
async def create_portal_session(
    current_user: User = Depends(get_current_user),
):
    """顧客ポータルセッションを作成"""
    subscription = await subscription_service.get_user_subscription(current_user.email)
    
    if not subscription or not subscription.get("stripe_customer_id"):
        raise HTTPException(status_code=404, detail="No subscription found")
    
    portal_url = await stripe_service.create_portal_session(
        subscription["stripe_customer_id"]
    )
    
    return {"portal_url": portal_url}

@router.get("/status")
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
):
    """サブスクリプション状態を取得"""
    subscription = await subscription_service.get_user_subscription(current_user.email)
    return subscription

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Stripe Webhookを処理"""
    payload = await request.body()
    signature = request.headers.get("stripe-signature")
    
    try:
        event = await stripe_service.handle_webhook(payload, signature)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # イベントタイプに応じて処理
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        customer_id = session["customer"]
        subscription_id = session["subscription"]
        
        # サブスクリプション情報を取得
        subscription_obj = await stripe_service.get_subscription(subscription_id)
        plan = session["metadata"]["plan"]
        status = subscription_obj["status"]
        current_period_end = datetime.fromtimestamp(
            subscription_obj["current_period_end"]
        )
        
        # Notionを更新
        # メールアドレスを取得する必要がある
        # Stripe Customerから取得可能
        
    elif event["type"] == "customer.subscription.updated":
        subscription_obj = event["data"]["object"]
        # サブスクリプション更新時の処理
        
    elif event["type"] == "customer.subscription.deleted":
        subscription_obj = event["data"]["object"]
        # サブスクリプション削除時の処理
    
    return {"status": "success"}
```

### 5. main.pyにルートを追加

```python
from app.routes import subscription

app.include_router(subscription.router)
```

---

## 🎨 フロントエンド実装

### 1. 価格ページの作成

`frontend/app/pricing/page.tsx`を作成：

```typescript
"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth-context";
import { useRouter } from "next/navigation";

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (plan: string, billingPeriod: string) => {
    if (!user) {
      router.push("/signup");
      return;
    }

    setLoading(`${plan}-${billingPeriod}`);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/subscription/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            plan,
            billing_period: billingPeriod,
          }),
        }
      );

      const data = await response.json();
      
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("決済セッションの作成に失敗しました");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-20">
      {/* 価格プランの表示 */}
      {/* ランディングページと同じデザイン */}
    </div>
  );
}
```

### 2. ダッシュボードにサブスクリプション管理を追加

`frontend/app/dashboard/page.tsx`に追加：

```typescript
const [subscription, setSubscription] = useState<any>(null);

useEffect(() => {
  const fetchSubscription = async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/subscription/status`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    const data = await response.json();
    setSubscription(data);
  };

  if (user) {
    fetchSubscription();
  }
}, [user]);

const handleManageSubscription = async () => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/subscription/portal`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }
  );
  const data = await response.json();
  window.location.href = data.portal_url;
};
```

---

## 🔔 Webhook実装

### Webhookエンドポイントのセキュリティ

1. **署名検証**: Webhookの署名を検証して、Stripeからのリクエストであることを確認
2. **イベント処理**: 各イベントタイプに応じた処理を実装
3. **エラーハンドリング**: エラー時のログ記録とリトライ処理

### 実装例

```python
@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("stripe-signature")
    
    try:
        event = await stripe_service.handle_webhook(payload, signature)
    except ValueError as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    
    # イベント処理
    if event["type"] == "checkout.session.completed":
        await handle_checkout_completed(event)
    elif event["type"] == "customer.subscription.updated":
        await handle_subscription_updated(event)
    elif event["type"] == "customer.subscription.deleted":
        await handle_subscription_deleted(event)
    
    return {"status": "success"}
```

---

## 🧪 テスト方法

### 1. Stripeテストモード
1. Stripeダッシュボードでテストモードに切り替え
2. テスト用のAPIキーを使用
3. テスト用のカード番号を使用:
   - 成功: `4242 4242 4242 4242`
   - 3Dセキュア: `4000 0025 0000 3155`

### 2. Webhookテスト
1. Stripe CLIを使用してローカルでテスト:
```bash
stripe listen --forward-to localhost:8000/api/webhook/stripe
```

2. テストイベントを送信:
```bash
stripe trigger checkout.session.completed
```

### 3. 統合テスト
1. 無料体験開始 → プラン選択 → 決済 → Webhook処理の流れをテスト
2. 各プランの機能制限が正しく動作するか確認

---

## 📝 実装チェックリスト

### バックエンド
- [ ] Stripeサービスの実装
- [ ] サブスクリプションサービスの実装
- [ ] APIルートの作成
- [ ] Webhookエンドポイントの実装
- [ ] エラーハンドリング

### フロントエンド
- [ ] 価格ページの作成
- [ ] チェックアウトフローの実装
- [ ] ダッシュボードにサブスクリプション管理を追加
- [ ] プラン変更・キャンセル機能

### 設定
- [ ] Stripeアカウントの作成
- [ ] 価格（Price）の作成
- [ ] Webhookエンドポイントの設定
- [ ] 環境変数の設定

### テスト
- [ ] テストモードでの動作確認
- [ ] Webhookの動作確認
- [ ] エラーケースのテスト

---

## 🚀 次のステップ

1. **実装開始**: 上記の手順に従って実装
2. **テスト**: Stripeテストモードで動作確認
3. **本番環境**: 本番環境のAPIキーに切り替え
4. **監視**: Stripeダッシュボードで決済状況を監視

---

**このガイドに従って実装することで、安全で信頼性の高い課金システムを構築できます。**
