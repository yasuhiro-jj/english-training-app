/**
 * 本番（ライブモード）で作成された Payment Link の既定 URL。
 * 環境変数が無いビルドではこれらが使われるため、ローカル検証では必ず .env.local でテスト用 URL を上書きすること。
 */
const LIVE_BASIC_MONTHLY = 'https://buy.stripe.com/cNi5kD8L16tPapN5Wc5gc04';
const LIVE_BASIC_YEARLY = 'https://buy.stripe.com/4gM28r0evbO99lJ4S85gc05';
const LIVE_PREMIUM_MONTHLY = 'https://buy.stripe.com/00w00j0ev05rcxV84k5gc06';
const LIVE_PREMIUM_YEARLY = 'https://buy.stripe.com/14A6oHd1h5pL2Xl2K05gc07';

function paymentLinkFromEnv(
  value: string | undefined,
  fallback: string,
): string {
  const v = value?.trim();
  return v ? v : fallback;
}

/**
 * Basic 年額・Premium 月額・Premium 年額の個別変数が空のときに使うテスト用リンク（例: 「2999円 テスト２」）。
 */
function paymentLinkWithSharedTestFallback(
  specific: string | undefined,
  sharedTest: string | undefined,
  liveFallback: string,
): string {
  const primary = specific?.trim();
  if (primary) return primary;
  const shared = sharedTest?.trim();
  if (shared) return shared;
  return liveFallback;
}

const sharedTestLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_TEST_SHARED;

/** テストモードの Payment Link URL を .env に設定（Basic 月額は個別必須推奨） */
export const stripePaymentLinkBasicMonthly = paymentLinkFromEnv(
  process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_BASIC_MONTHLY,
  LIVE_BASIC_MONTHLY,
);

export const stripePaymentLinkBasicYearly = paymentLinkWithSharedTestFallback(
  process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_BASIC_YEARLY,
  sharedTestLink,
  LIVE_BASIC_YEARLY,
);

export const stripePaymentLinkPremiumMonthly = paymentLinkWithSharedTestFallback(
  process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PREMIUM_MONTHLY,
  sharedTestLink,
  LIVE_PREMIUM_MONTHLY,
);

export const stripePaymentLinkPremiumYearly = paymentLinkWithSharedTestFallback(
  process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PREMIUM_YEARLY,
  sharedTestLink,
  LIVE_PREMIUM_YEARLY,
);
