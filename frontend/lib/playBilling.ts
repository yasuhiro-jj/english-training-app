/**
 * Google Play 課金（Android アプリ = TWA 内でのみ使用）。
 * Digital Goods API + Payment Request API を使う。
 *
 * Play Console の定期購入商品ID。バックエンドの GOOGLE_PLAY_PRODUCT_PLAN_MAP と一致させること。
 */
import { api } from './api';

export const PLAY_BILLING_METHOD = 'https://play.google.com/billing';
const TWA_PACKAGE = 'com.yasuhiro.watanabe.deepspeak';
const TWA_FLAG_KEY = 'deepspeak_twa';

export const PLAY_PRODUCT_IDS = {
  'basic-monthly': 'deepspeak_basic_monthly',
  'basic-yearly': 'deepspeak_basic_yearly',
  'premium-monthly': 'deepspeak_premium_monthly',
  'premium-yearly': 'deepspeak_premium_yearly',
} as const;

export type PlanKey = keyof typeof PLAY_PRODUCT_IDS;

type DigitalGoodsService = {
  getDetails(itemIds: string[]): Promise<
    { itemId: string; title: string; price: { currency: string; value: string } }[]
  >;
  listPurchases(): Promise<{ itemId: string; purchaseToken: string }[]>;
};

type WindowWithDG = Window & {
  getDigitalGoodsService?: (provider: string) => Promise<DigitalGoodsService>;
};

/**
 * Android アプリ(TWA)から開かれているか。
 * TWA の起動時だけ document.referrer が android-app://<package> になるため、検出して
 * localStorage に残す。localStorage は同じ端末の Chrome と共有されるので、保存済みフラグは
 * アプリ表示(display-mode: standalone)のときだけ有効にし、通常のブラウザでは使わない。
 */
export function isAndroidApp(): boolean {
  if (typeof window === 'undefined') return false;
  const fromApp = document.referrer.startsWith(`android-app://${TWA_PACKAGE}`);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  try {
    if (fromApp) {
      localStorage.setItem(TWA_FLAG_KEY, '1');
      return true;
    }
    return standalone && localStorage.getItem(TWA_FLAG_KEY) === '1';
  } catch {
    return fromApp;
  }
}

export function isPlayBillingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as WindowWithDG).getDigitalGoodsService === 'function'
  );
}

async function getService(): Promise<DigitalGoodsService> {
  const w = window as WindowWithDG;
  if (!w.getDigitalGoodsService) {
    throw new Error('この環境ではGoogle Play課金を利用できません');
  }
  return w.getDigitalGoodsService(PLAY_BILLING_METHOD);
}

/** Play 側の現地通貨の価格表示を取得する（取得できなければ空） */
export async function fetchLocalizedPrices(): Promise<Record<string, string>> {
  try {
    const service = await getService();
    const details = await service.getDetails(Object.values(PLAY_PRODUCT_IDS));
    const out: Record<string, string> = {};
    for (const d of details) {
      out[d.itemId] = new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: d.price.currency,
        maximumFractionDigits: 0,
      }).format(Number(d.price.value));
    }
    return out;
  } catch {
    return {};
  }
}

export class PlayPurchaseCancelled extends Error {}

/** 購入画面を表示し、成功したらバックエンドで検証してプランを反映する */
export async function purchasePlan(planKey: PlanKey): Promise<{ plan: string; status: string }> {
  const productId = PLAY_PRODUCT_IDS[planKey];
  await getService(); // 未対応環境ならここで例外

  const request = new PaymentRequest(
    [{ supportedMethods: PLAY_BILLING_METHOD, data: { sku: productId } }],
    { total: { label: 'Total', amount: { currency: 'JPY', value: '0' } } },
  );

  let response: PaymentResponse;
  try {
    response = await request.show();
  } catch (e) {
    // ユーザーが購入画面を閉じた場合など
    throw new PlayPurchaseCancelled(e instanceof Error ? e.message : 'cancelled');
  }

  try {
    const details = response.details as { purchaseToken?: string };
    if (!details.purchaseToken) {
      throw new Error('購入情報を取得できませんでした');
    }
    const result = await api.verifyPlayPurchase(productId, details.purchaseToken);
    await response.complete('success');
    return result;
  } catch (e) {
    await response.complete('fail').catch(() => {});
    throw e;
  }
}

/**
 * 既存の購入を照会してバックエンドに再送する（機種変更・再インストール後の復元用）。
 * 戻り値は復元できた件数。
 */
export async function restorePurchases(): Promise<number> {
  const service = await getService();
  const purchases = await service.listPurchases();
  const known = new Set<string>(Object.values(PLAY_PRODUCT_IDS));
  let restored = 0;
  for (const p of purchases) {
    if (!known.has(p.itemId)) continue;
    try {
      await api.verifyPlayPurchase(p.itemId, p.purchaseToken);
      restored += 1;
    } catch {
      // 他アカウントに紐づいている・期限切れ等は無視して次へ
    }
  }
  return restored;
}
