# Stripe テストモード用 Payment Link 作成手順

開発・検証で **テストカード** を使うには、Stripe ダッシュボードの **テストモード** で作成した Payment Link の URL を、アプリの環境変数に設定します。

## 前提

- Stripe アカウントにログインできること
- フロントは `lib/stripePaymentLinks.ts` が参照する **4 本**のリンク（Basic/Premium × 月額/年額）を用意する

## `lib/stripePaymentLinks.ts` の既定 URL（本番・ライブモード）

環境変数を設定しないビルドでは、次の **ライブモード用 Payment Link** がフォールバックとして使われます（テストカード不可）。

| 用途 | 既定 URL（ライブ） |
|------|---------------------|
| Basic 月額 | `https://buy.stripe.com/cNi5kD8L16tPapN5Wc5gc04` |
| Basic 年額 | `https://buy.stripe.com/4gM28r0evbO99lJ4S85gc05` |
| Premium 月額 | `https://buy.stripe.com/00w00j0ev05rcxV84k5gc06` |
| Premium 年額 | `https://buy.stripe.com/14A6oHd1h5pL2Xl2K05gc07` |

ローカルでテストカードを使う場合は、**必ず**下記の環境変数で **テストモードで作成したリンク URL** に上書きしてください。

## 既にあるテスト用リンクの割り当て（例）

Stripe のテストモードに次のようなリンクだけがある場合のおすすめです。

| Stripe 側の名前（例） | アプリでの用途 |
|----------------------|----------------|
| テスト 2980円（一回払い） | **Basic 月額** → `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_BASIC_MONTHLY` にそのリンクの URL を設定 |
| 2999円 テスト２（¥2,999/月）など | **Basic 年額・Premium 月額・Premium 年額** をまとめて検証する暫定リンク → `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_TEST_SHARED` に設定 |

`NEXT_PUBLIC_STRIPE_PAYMENT_LINK_TEST_SHARED` を設定すると、`BASIC_YEARLY` / `PREMIUM_MONTHLY` / `PREMIUM_YEARLY` の **個別の環境変数が空のとき**、既定のライブ URL の代わりにこの **共通テストリンク** が使われます。

本番リリース前には、プランごとに **別々の Payment Link と Price** に分けることを推奨します。

### URL のコピー場所（テストモード）

1. ダッシュボード右上で **テストモード ON**
2. **決済リンク**（Payment Links）を開く
3. 対象リンクの **⋯ メニュー** → **コピー**（またはリンク詳細画面の URL 表示）で `https://buy.stripe.com/...` をコピー

## 不足しているプラン用の商品・Payment Link を新規作成する（テストモード）

Basic/Premium × 月額/年額で **4 種類そろえたい**ときは、テストモードで不足している **商品（Price）** と **Payment Link** を追加します。

### A. 商品・Price を作る

1. **テストモード ON** の状態で **商品カタログ** を開く  
2. **商品を追加**  
3. 名前（例: `Premium 月額（テスト）`）、説明は任意  
4. **料金を追加** で Price を設定する  
   - **月額サブスクリプション**: 「定期的な支払い」→ 請求間隔 **月**、金額 **¥4,980**（本番に合わせる）  
   - **年額**: 請求間隔 **年**、金額 **¥29,800** / **¥49,800** など  
   - **一回払い**: 「一回限りの支払い」（年会費を一回で取る検証用など）  
5. **保存**

※ Basic 年額・Premium 月額・Premium 年額など、**足りない分だけ**同様に商品を追加してよいです。

### B. Payment Link を作る

1. **決済リンク** → **新規作成**  
2. **商品** で、手順 A で作った **Price を 1 つだけ** 選択  
3. メール収集や利用規約など、本番リンクに合わせてオプションを設定  
4. **リンクを作成** → 表示された `https://buy.stripe.com/...` をコピー  
5. アプリの環境変数へ対応させて貼る  

| 作ったリンクが表すプラン | 設定する環境変数 |
|--------------------------|------------------|
| Basic 月額 | `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_BASIC_MONTHLY` |
| Basic 年額 | `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_BASIC_YEARLY` |
| Premium 月額 | `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PREMIUM_MONTHLY` |
| Premium 年額 | `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PREMIUM_YEARLY` |

個別変数をすべて設定すると、`NEXT_PUBLIC_STRIPE_PAYMENT_LINK_TEST_SHARED` は **不要**（未設定で問題ありません）。

## 手順 1: `.env.local` に貼り付ける

リポジトリの `frontend` フォルダにある `.env.local` を開き（無ければ `.env.example` を参考に新規作成）、次のように **控えた 4 本の URL** を設定する。

```env
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_BASIC_MONTHLY=https://buy.stripe.com/xxxxxxxx
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_BASIC_YEARLY=https://buy.stripe.com/xxxxxxxx
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PREMIUM_MONTHLY=https://buy.stripe.com/xxxxxxxx
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PREMIUM_YEARLY=https://buy.stripe.com/xxxxxxxx
```

**2 本だけテストリンクがある場合（2980 一回 + 2999/月 など）の最短例:**

```env
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_BASIC_MONTHLY=https://buy.stripe.com/（2980一回のテストリンク）
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_TEST_SHARED=https://buy.stripe.com/（2999円テスト2など共通テストリンク）
```

- 値の前後にスペースを入れない  
- URL はダッシュボードに表示されたものをそのままコピーする  
- **`BASIC_MONTHLY` と `TEST_SHARED` を両方空のままにすると、Basic 月額だけライブ URL に戻る**ため、テストカード検証時は必ず設定すること  

## 手順 2: 開発サーバーを再起動する

`NEXT_PUBLIC_*` はビルド／起動時に読み込まれます。

```powershell
cd frontend
npm run dev
```

（ポートはプロジェクトの設定どおり。例: `3001`。）

## 手順 3: 動作確認する

1. ブラウザで LP を開き、プランの「選択」「今すぐ始める」などから Payment Link に飛ぶ  
2. Stripe の支払い画面で **[テストモード]** の表示があることを確認する  
3. [テスト用カード番号](https://docs.stripe.com/testing)（例: `4242 4242 4242 4242`）で決済できることを確認する  

## 本番デプロイ時の注意

- **Vercel など本番環境**では、上記 4 変数を **未設定**にすると、アプリは **コード内のデフォルト（本番用リンク）** を使います。  
- プレビュー環境だけテストリンクを載せる運用も可能です。

## トラブルシュート

| 現象 | 確認すること |
|------|----------------|
| 「ライブモードでテストカード」などのエラー | リンクが **テストモードで作成**されているか、`.env.local` に **誤って本番 URL** が入っていないか |
| 環境変数を変えたが反映されない | **開発サーバー再起動**、`NEXT_PUBLIC_` の綴りミス |
| リンクはテストだが金額が違う | テストモードの **Price** が意図したプランと一致しているか |

---

詳細は Stripe 公式: [Payment Links](https://docs.stripe.com/payment-links) / [テスト](https://docs.stripe.com/testing)
