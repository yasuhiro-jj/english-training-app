# Google Play 課金 実装メモ(Android版)

Android アプリ(TWA)内の有料プランは Google Play 課金、Web ブラウザは従来どおり Stripe。
購入状態は両方とも Notion のユーザーDB(`Subscription Plan` / `Subscription Status`)に集約する。

## 方針
- Android(TWA)内では Stripe のリンクを一切出さない(`components/AppEnv.tsx`、`PlanCards.tsx`、`app/page.tsx`)。
- TWA 判定: 起動時の `document.referrer` が `android-app://com.yasuhiro.watanabe.deepspeak`。保存済みフラグはアプリ表示(standalone)のときだけ有効。判定前は安全側(外部リンクを出さない)。
- 商品は定期購入4つ(各1ベースプラン)。Digital Goods API は定期購入IDで商品を指定するため、月額/年額を別商品にしている。

| 商品ID | プラン | 価格 |
|---|---|---|
| `deepspeak_basic_monthly` | Basic | ¥2,980 / 月 |
| `deepspeak_basic_yearly` | Basic | ¥29,800 / 年 |
| `deepspeak_premium_monthly` | Premium | ¥4,980 / 月 |
| `deepspeak_premium_yearly` | Premium | ¥49,800 / 年 |

商品IDを変える場合は `frontend/lib/playBilling.ts` の `PLAY_PRODUCT_IDS` と、バックエンドの `GOOGLE_PLAY_PRODUCT_PLAN_MAP`(既定値は `google_play_service.py`)を揃える。

## 実装済みの範囲
- バックエンド
  - `POST /api/play/verify`(要ログイン): 購入トークンを Google Play Developer API(`purchases.subscriptionsv2.get`)で検証 → 未承認なら acknowledge → Notion 更新。
    - 他アカウントに紐づいた購入トークンは 409 で拒否。商品IDの不一致、未知の商品、保留(PENDING)は拒否。
  - `POST /api/webhooks/play?token=<GOOGLE_PLAY_RTDN_SECRET>`: Pub/Sub push(RTDN)を受けて Notion を更新。失敗時は 5xx を返して再送させる。
  - 状態の対応: ACTIVE / IN_GRACE_PERIOD → Active、CANCELED(期限内)→ Active、CANCELED(期限後)/ EXPIRED → Free + Cancelled、ON_HOLD / PAUSED → Expired。
  - テスト: `backend/tests/test_play_billing.py`(19件)。
- フロント
  - `lib/playBilling.ts`: Digital Goods API / Payment Request による購入・価格取得・購入の復元。
  - `PlanCards.tsx`: Android では「購入」ボタン+「購入を復元する」、Web では従来の Stripe リンク。
  - 「自動課金は一切発生しません」の表示は Web のみ(Android は定期購入の自動更新を明記)。
  - プライバシーポリシー・アカウント削除ページに Google Play を追記。
- TWA(`C:\dev\android-twa`、リポジトリ外)
  - `billing:1.2.0` の追加、`PaymentActivity` / `PaymentService` の追加、`DelegationService` に `DigitalGoodsRequestHandler` を登録(Bubblewrap の playBilling 機能と同じ内容を手で反映)。
  - `twa-manifest.json` に `features.playBilling`、versionCode 12 / 1.0.4。
  - Play課金ライブラリの要件で minSdk を 21 → 23(Android 6.0以上)に変更。デバッグビルド(`gradlew assembleDebug`)の成功を確認済み。

## 公開までに必要な作業(手動・要承認)

### 1. Notion(ユーザーDB)に項目を追加
| 項目名 | 型 | 用途 |
|---|---|---|
| `Play Purchase Token` | テキスト | RTDN から利用者を特定する |
| `Subscription Source` | セレクト(`Stripe` / `Play`) | 購入元の記録 |

項目名を変える場合は環境変数 `NOTION_PLAY_PURCHASE_TOKEN_PROPERTY` / `NOTION_SUBSCRIPTION_SOURCE_PROPERTY` で指定。
項目が無いと `/api/play/verify` は 500 を返す(購入の紐づけを保存できないため)。

### 2. Google Cloud / Play Console の API アクセス
1. Google Cloud でサービスアカウントを作成し、JSON 鍵を発行する。
2. Play Console → ユーザーと権限 → サービスアカウントを招待し、アプリの「財務データ」「注文と定期購入の管理」権限を付与。
3. Railway の環境変数に `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`(JSON そのもの、または base64)を設定。**鍵はチャットに貼らない。**

### 3. Railway の環境変数
`.env.example` の Google Play の項目を参照(`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`、`GOOGLE_PLAY_RTDN_SECRET` は必須)。
`/health` の `google_play_configured` / `google_play_rtdn_secret_configured` で設定の有無を確認できる。

### 4. AAB のビルドと内部テストへのアップロード
1. `C:\dev\android-twa` で release の AAB をビルド(versionCode 12)。署名鍵のパスワードが必要。
2. Play Console の内部テストにアップロード。
3. 課金対応の AAB をアップロードしたあとに、「収益化 → 定期購入」で上の4商品(各1ベースプラン、更新タイプは自動更新)を作成して有効化。

### 5. RTDN(リアルタイム通知)
1. Cloud Pub/Sub でトピックを作成し、`google-play-developer-notifications@system.gserviceaccount.com` に「パブリッシャー」権限を付与。
2. push サブスクリプションの URL を `https://<RailwayのURL>/api/webhooks/play?token=<GOOGLE_PLAY_RTDN_SECRET>` にする。
3. Play Console → 収益化の設定 → リアルタイム通知にトピック名を登録し、テスト通知を送る。

### 6. テスト
- Play Console の「ライセンス テスト」にテスターのアカウントを登録(テスト購入は課金されない。更新間隔は短縮される)。
- 内部テストから端末にインストールし、購入 → Notion 反映 → 機能制限の解除、解約 → 期限後に Free へ戻ること、再インストール後の「購入を復元する」を確認。

### 7. Play Console の申告の見直し
- データセーフティ: 「購入履歴」(購入トークン・購入状態)の収集と、Google への共有(決済処理)を確認。Stripe の記載はWeb向けとして維持。
- 課金を有効にしたあとに、アプリのコンテンツ(特に金融取引機能・データセーフティ)に影響がないか見直す。

## 既知の制約・要確認
- Digital Goods API は TWA(Play 経由でインストールされたアプリ)でのみ動く。Web ブラウザ・PWA では使えない(その場合 Android 表示でも「この端末では購入できません」を出す)。
- API の細部(`subscriptionsv2` の項目名、acknowledge のパス、Billing ライブラリの版)は実機・実環境で確認すること。ここまでのテストはモックによるもの。
- Stripe と Play の併用: Notion の `Subscription Source` に購入元を記録し、Play で有効な購読があるユーザーには、Stripe 側のイベント(更新・解約など)で上書きしない(`stripe_service.py` の `_get_billing_state`)。Play の購読が終了(Cancelled / Expired)していれば、Stripe 側の更新が反映される。二重に購入されること自体は防げないため、画面側(Android は Play のみ、Web は Stripe のみ)で分けている。
- `GooglePlayService` は Notion 更新のために `StripeService` を内部で利用している(共通サービスへの切り出しは Stripe 側に影響が出るため見送り)。
