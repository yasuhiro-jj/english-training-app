/**
 * Google Play 課金（Android アプリ = TWA 内でのみ使用）。
 * Digital Goods API + Payment Request API を使う。
 *
 * Play Console の定期購入商品ID。バックエンドの GOOGLE_PLAY_PRODUCT_PLAN_MAP と一致させること。
 */
import { api, ApiError } from './api';

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

/** どの段階で止まったか（画面表示と原因の切り分け用） */
export type PurchaseStage = 'preparing' | 'sheet' | 'token' | 'verify';

export const STAGE_LABELS: Record<PurchaseStage, string> = {
  preparing: '購入の準備',
  sheet: '購入画面の表示',
  token: '購入情報の取得',
  verify: 'サーバーでの購入確認',
};

export class PlayPurchaseError extends Error {
  stage: PurchaseStage;
  /** 購入自体は成立しており、サーバーでの確認だけが残っている */
  pendingRetry: boolean;
  constructor(stage: PurchaseStage, message: string, pendingRetry = false) {
    super(message);
    this.name = 'PlayPurchaseError';
    this.stage = stage;
    this.pendingRetry = pendingRetry;
  }
}

// ---------- 未確認の購入を端末に保存し、確認できるまで自動で再送する ----------

const PENDING_KEY = 'deepspeak_pending_play_purchases';
const LAST_RESTORE_KEY = 'deepspeak_play_last_restore';
const PENDING_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000; // Play の承認期限（3日）
const RESTORE_INTERVAL_MS = 6 * 60 * 60 * 1000;

type PendingPurchase = { productId: string; purchaseToken: string; savedAt: number };

function loadPending(): PendingPurchase[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    const list = raw ? (JSON.parse(raw) as PendingPurchase[]) : [];
    const now = Date.now();
    return list.filter((p) => p.purchaseToken && now - p.savedAt < PENDING_MAX_AGE_MS);
  } catch {
    return [];
  }
}

function savePending(list: PendingPurchase[]): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(list));
  } catch {
    // 保存できない環境でも購入処理自体は続ける
  }
}

function addPending(productId: string, purchaseToken: string): void {
  const list = loadPending().filter((p) => p.purchaseToken !== purchaseToken);
  list.push({ productId, purchaseToken, savedAt: Date.now() });
  savePending(list);
}

function removePending(purchaseToken: string): void {
  savePending(loadPending().filter((p) => p.purchaseToken !== purchaseToken));
}

export function hasPendingPurchases(): boolean {
  return typeof window !== 'undefined' && loadPending().length > 0;
}

/** やり直しても結果が変わらないエラー（保存していた購入情報を捨ててよい） */
function isPermanentFailure(e: unknown): boolean {
  return e instanceof ApiError && (e.status === 400 || e.status === 409);
}

function describeError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return 'ログインが切れています。ログインし直してください';
    return e.status ? `${e.message}（コード ${e.status}）` : e.message;
  }
  return e instanceof Error ? e.message : '不明なエラー';
}

/** 購入画面を表示し、成功したらバックエンドで検証してプランを反映する */
export async function purchasePlan(
  planKey: PlanKey,
  onStage?: (stage: PurchaseStage) => void,
): Promise<{ plan: string; status: string }> {
  const productId = PLAY_PRODUCT_IDS[planKey];

  onStage?.('preparing');
  try {
    await getService();
  } catch (e) {
    throw new PlayPurchaseError('preparing', describeError(e));
  }

  onStage?.('sheet');
  let request: PaymentRequest;
  let response: PaymentResponse;
  try {
    request = new PaymentRequest(
      [{ supportedMethods: PLAY_BILLING_METHOD, data: { sku: productId } }],
      { total: { label: 'Total', amount: { currency: 'JPY', value: '0' } } },
    );
    response = await request.show();
  } catch (e) {
    // ユーザーが購入画面を閉じた場合など
    throw new PlayPurchaseCancelled(e instanceof Error ? e.message : 'cancelled');
  }

  onStage?.('token');
  const details = (response.details ?? {}) as { purchaseToken?: string };
  const token = details.purchaseToken;
  if (!token) {
    await response.complete('fail').catch(() => {});
    const keys = Object.keys(details as object).join(',') || '（なし）';
    throw new PlayPurchaseError(
      'token',
      `購入情報（購入トークン）を受け取れませんでした。受け取った項目: ${keys}`,
    );
  }

  // 確認が終わるまで端末に残す。失敗しても、次回の起動・ログイン時に自動で再送される
  addPending(productId, token);

  onStage?.('verify');
  try {
    const result = await api.verifyPlayPurchase(productId, token);
    removePending(token);
    await response.complete('success');
    return result;
  } catch (e) {
    await response.complete('fail').catch(() => {});
    if (isPermanentFailure(e)) removePending(token);
    throw new PlayPurchaseError('verify', describeError(e), !isPermanentFailure(e));
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
      removePending(p.purchaseToken);
      restored += 1;
    } catch (e) {
      if (isPermanentFailure(e)) removePending(p.purchaseToken);
      // 他アカウントに紐づいている・期限切れ等は無視して次へ
    }
  }
  return restored;
}

let recovering: Promise<number> | null = null;

/**
 * ログイン済みのアプリ内で呼ぶ。保存済みの未確認購入を再送し、
 * 一定間隔ごとに Play 側の購入一覧も照会する。確認できた件数を返す。
 */
export function recoverPurchases(force = false): Promise<number> {
  if (recovering) return recovering;
  recovering = (async () => {
    let done = 0;
    for (const p of loadPending()) {
      try {
        await api.verifyPlayPurchase(p.productId, p.purchaseToken);
        removePending(p.purchaseToken);
        done += 1;
      } catch (e) {
        if (isPermanentFailure(e)) removePending(p.purchaseToken);
      }
    }
    let last = 0;
    try {
      last = Number(localStorage.getItem(LAST_RESTORE_KEY) || 0);
    } catch {
      // ignore
    }
    if (force || Date.now() - last > RESTORE_INTERVAL_MS) {
      try {
        done += await restorePurchases();
        localStorage.setItem(LAST_RESTORE_KEY, String(Date.now()));
      } catch {
        // 課金が使えない環境・一覧取得の失敗は、次回に任せる
      }
    }
    return done;
  })().finally(() => {
    recovering = null;
  });
  return recovering;
}
