# Stripe 決済フロー対応 報告書

**対象プロジェクト:** `english-training-app-clean/frontend`（DeepSpeak ランディング／プラン誘導）  
**作成目的:** テストカードエラー原因の整理、決済経路の明確化、テストモードでの開発可否に関する対応内容の記録

---

## 1. 背景・現象

- Stripe の画面で「**ライブモードのリクエストにテスト用クレジットカードが使用された**」系のエラーが発生した。
- 本番（ライブ）で作成された **Payment Link** と **テストカード** の組み合わせでは、この種のエラーは仕様どおり発生する。

---

## 2. 原因（確定事項）

1. **アプリ側の決済導線**は、`buy.stripe.com/...` 形式の **Stripe Payment Link への直接遷移**（`<a href>`）であり、`/api/create-checkout-session` のような **バックエンドでの Checkout Session 作成 API は使用していない**（当該フロントの実装範囲）。
2. `lib/stripePaymentLinks.ts` にフォールバックとして記載されている既定 URL は、**ダッシュボードのライブモードで作成された Payment Link** に対応する想定のため、環境変数未設定時は **ライブリンクにフォールバック**する。
3. **Railway の `STRIPE_SECRET_KEY` が `sk_test_...` であっても**、上記 Payment Link フローでは「リンクのライブ／テスト」は **ダッシュボード上でリンクを作ったモード**で決まるため、**ライブ Payment Link × テストカード** の矛盾とは両立しうる（バックエンドのキーだけでは Payment Link のモードは変わらない）。

---

## 3. 実施した対応（コード・設定）

| 項目 | 内容 |
|------|------|
| Payment Link の設定化 | `lib/stripePaymentLinks.ts` で `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_*` により URL を上書き可能にした。 |
| ライブ既定の明示 | フォールバック URL を定数化し、コメントで「ライブ既定」であることを明記した。 |
| テストリンク共有 | `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_TEST_SHARED` を追加。Basic 年額・Premium 月額・Premium 年額の個別変数が空のとき、ライブ既定の代わりに **共通のテスト用リンク** を利用できる。 |
| Next 設定 | `next.config.ts` の `env` に Payment Link 関連の `NEXT_PUBLIC_*` を追加。 |
| ドキュメント | `docs/STRIPE_TEST_PAYMENT_LINKS.md` に、テストモードでのリンク作成・`.env.local` 例・不足プランの Stripe 側作成手順を記載。 |
| 環境ファイル | `.env.example` を更新。`.env.local` に Payment Link 用変数の枠とコメントを追加（実際の `buy.stripe.com/...` はダッシュボードから貼り付けが必要）。 |


---

## 4. 運用上の推奨

### 4.1 ローカル／検証環境

- Stripe ダッシュボードを **テストモード**にし、**テストモードで作成した Payment Link** の URL を `.env.local` に設定する。
- **最短構成:**  
  - Basic 月額用テストリンク → `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_BASIC_MONTHLY`  
  - その他プラン暫定共有 → `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_TEST_SHARED`  
- **本番に近い構成:** プランごとに 4 本のテスト Payment Link を用意し、`BASIC_MONTHLY` / `BASIC_YEARLY` / `PREMIUM_MONTHLY` / `PREMIUM_YEARLY` をすべて設定する。

### 4.2 本番（Vercel 等）

- Payment Link の `NEXT_PUBLIC_*` を **未設定**にすると、コード内の **ライブ既定 URL** が使われる（従来どおりの本番誘導）。
- プレビュー環境のみテストリンクを載せる運用も可能。

### 4.3 セキュリティ・秘密情報

- `.env.local` や秘密鍵はリポジトリにコミットしないこと。
- 報告書・チャットに完全な API キーやカード情報を載せないこと。

---

## 5. 未完了・担当者作業（ダッシュボード）

以下は **Stripe ダッシュボード上での操作**が必要で、リポジトリだけでは完了しない。

1. テストモードで「テスト 2980円（一回払い）」など既存リンクの **実 URL** をコピーし、`NEXT_PUBLIC_STRIPE_PAYMENT_LINK_BASIC_MONTHLY` に設定する。  
2. 「2999円 テスト２」等のリンク URL を `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_TEST_SHARED` に設定する（またはプラン別に 4 変数へ分割設定）。  
3. プランが不足している場合は、テストモードで **商品（Price）と Payment Link を新規作成**する（手順は `STRIPE_TEST_PAYMENT_LINKS.md` 参照）。  
4. 環境変数変更後は **`npm run dev` の再起動**（および本番なら再デプロイ）を行う。

---

## 6. 結論

- **原因:** ライブモードの Payment Link とテストカードの組み合わせ。  
- **対策:** 開発時はテストモードで作成したリンク URL を環境変数で指定する仕組みを導入した。  
- **バックエンドの `sk_test_` の有無は、Payment Link 直リンクのモード不一致説明とは別軸**であり、今回のフローでは決済ページのモードは主に **リンク自体の作成モード**で決まる。

---

## 7. 参照ファイル

| ファイル | 役割 |
|----------|------|
| `lib/stripePaymentLinks.ts` | Payment Link URL の解決ロジック |
| `components/PlanCards.tsx` | プランカードのリンク先 |
| `app/page.tsx` | LP 内の「今すぐ始める」等のリンク先 |
| `docs/STRIPE_TEST_PAYMENT_LINKS.md` | テストリンク作成・環境変数の手順書 |
| `next.config.ts` | `NEXT_PUBLIC_*` のビルド時受け渡し |
